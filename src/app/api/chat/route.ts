import { llmProvider, runAgentTurn } from "@/lib/llm";
import { logSafe } from "@/lib/pii";
import { tooMany } from "@/lib/rate";
import type { TurnResult } from "@/lib/types";

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function stream(result: TurnResult): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      send({ type: "meta", conversationId: result.conversationId, tools: result.tools });
      for (const card of result.cards) send({ type: "card", card });
      for (const citation of result.citations) send({ type: "citation", citation });
      const parts = result.text.split(/(\s+)/);
      for (const part of parts) {
        if (part) send({ type: "token", text: part });
      }
      send({ type: "suggestions", suggestions: result.suggestions });
      send({
        type: "done",
        messageId: result.messageId,
        handoff: result.handoff,
        mode: llmProvider() === "offline" ? "demo" : "live",
      });
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export async function POST(request: Request) {
  if (tooMany(clientKey(request))) {
    return Response.json({ error: "Too many messages. Wait a few minutes and try again." }, { status: 429 });
  }
  let body: { conversationId?: string | null; message?: string };
  try {
    body = (await request.json()) as { conversationId?: string | null; message?: string };
  } catch {
    return Response.json({ error: "Send a JSON message." }, { status: 400 });
  }
  const message = String(body.message ?? "").trim();
  if (!message) return Response.json({ error: "Type a message first." }, { status: 400 });
  if (message.length > 2000) {
    return Response.json({ error: "That message is too long. Keep it under 2,000 characters." }, { status: 400 });
  }
  try {
    const result = await runAgentTurn(body.conversationId ?? null, message);
    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("application/json")) return Response.json(result);
    return stream(result);
  } catch (error) {
    logSafe("chat-error", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "The desk hit a snag. Try again." }, { status: 500 });
  }
}
