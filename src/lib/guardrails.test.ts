import { beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchTool } from "@/lib/dispatch";
import { databasePath, resetStore, getStore } from "@/lib/db";
import { llmProvider, runAgentTurn } from "@/lib/llm";
import { maskPii } from "@/lib/pii";
import { cosine, embedTokens } from "@/lib/retrieve";
import { KB_FILES } from "@/lib/kb";

beforeEach(() => {
  resetStore();
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
});

describe("guardrails and retrieval", () => {
  it("masks emails, phones, and card-like numbers", () => {
    const masked = maskPii("mail maya.chen@example.com call 415-555-0199 card 4242424242424242");
    expect(masked).not.toContain("maya.chen@");
    expect(masked).toContain("m***@example.com");
    expect(masked).toContain("***-***-****");
    expect(masked).not.toContain("4242424242424242");
  });

  it("rejects a tool call that skips the email", () => {
    const result = dispatchTool(getStore(), "track_shipment", { orderNumber: "DW-10482" }, {
      conversationId: null,
    });
    expect(result.outcome.ok).toBe(false);
  });

  it("keeps the ledger in /tmp when Vercel cannot write the project directory", () => {
    const previousPath = process.env.DW_DB_PATH;
    const previousVercel = process.env.VERCEL;
    delete process.env.DW_DB_PATH;
    process.env.VERCEL = "1";
    try {
      expect(databasePath()).toBe("/tmp/driftwood.sqlite");
    } finally {
      if (previousPath === undefined) delete process.env.DW_DB_PATH;
      else process.env.DW_DB_PATH = previousPath;
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;
    }
  });

  it("keeps a local embedding and at least 15 knowledge files", () => {
    expect(KB_FILES.length).toBeGreaterThanOrEqual(15);
    const vector = embedTokens(["rain", "shell"]);
    expect(cosine(vector, vector)).toBeCloseTo(1, 5);
  });

  it("stays offline without keys and falls back when Groq fails", async () => {
    expect(llmProvider()).toBe("offline");
    process.env.GROQ_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = await runAgentTurn(null, "How long does standard shipping take?");
      expect(result.text).toContain("4–7");
      expect(result.citations.some((citation) => citation.slug === "shipping")).toBe(true);
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      delete process.env.GROQ_API_KEY;
      vi.unstubAllGlobals();
    }
  });

  it("falls through from Groq to Gemini when Groq errors", async () => {
    process.env.GROQ_API_KEY = "test-key";
    process.env.GEMINI_API_KEY = "gem-key";
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(String(url));
        if (String(url).includes("groq")) return new Response("nope", { status: 503 });
        return Response.json({
          candidates: [{ content: { parts: [{ functionCall: { name: "search_knowledge", args: { query: "shipping time" } } }] } }],
        });
      }),
    );
    try {
      const result = await runAgentTurn(null, "How long does standard shipping take?");
      expect(urls.some((url) => url.includes("api.groq.com"))).toBe(true);
      expect(urls.some((url) => url.includes("generativelanguage.googleapis.com"))).toBe(true);
      expect(result.tools.some((tool) => tool.name === "search_knowledge")).toBe(true);
    } finally {
      delete process.env.GROQ_API_KEY;
      delete process.env.GEMINI_API_KEY;
      vi.unstubAllGlobals();
    }
  });

  it("executes a Groq tool call and keeps the citation", async () => {
    process.env.GROQ_API_KEY = "test-key";
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        calls += 1;
        const body = JSON.parse(String(init.body));
        expect(body.tools?.length).toBeGreaterThan(5);
        expect(body.model).toBe("llama-3.3-70b-versatile");
        if (calls === 1) {
          return Response.json({
            choices: [
              {
                message: {
                  content: "",
                  tool_calls: [
                    {
                      id: "call-1",
                      type: "function",
                      function: { name: "search_knowledge", arguments: JSON.stringify({ query: "return policy 30 days" }) },
                    },
                  ],
                },
              },
            ],
          });
        }
        return Response.json({
          choices: [{ message: { content: "You have **30 days** from delivery." } }],
        });
      }),
    );
    try {
      const result = await runAgentTurn(null, "What is your return policy?");
      expect(result.text).toContain("30 days");
      expect(result.tools.some((tool) => tool.name === "search_knowledge")).toBe(true);
      expect(result.citations.some((citation) => citation.slug === "returns")).toBe(true);
    } finally {
      delete process.env.GROQ_API_KEY;
      vi.unstubAllGlobals();
    }
  });
});
