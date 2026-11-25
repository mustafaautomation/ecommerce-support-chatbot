"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichCards } from "@/components/rich-cards";
import { STARTER_PROMPTS } from "@/lib/demo";
import type { Card, Citation, ToolTrace } from "@/lib/types";

type Bubble = {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards: Card[];
  citations: Citation[];
  tools: ToolTrace[];
};

const greeting: Bubble = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi, I’m Rowan. I can track a Driftwood order, start a return, or read the shop notes on shipping, sizing, and care. Orders open only with the number and the checkout email.",
  cards: [],
  citations: [],
  tools: [],
};

export function ChatPanel({
  pendingPrompt,
  onPromptConsumed,
}: {
  pendingPrompt?: string | null;
  onPromptConsumed?: () => void;
}) {
  const [messages, setMessages] = useState<Bubble[]>([greeting]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(STARTER_PROMPTS);
  const logRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const lastSent = useRef<string | null>(null);
  const launched = useRef<string | null>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    lastSent.current = message;
    setDraft("");
    setError(null);
    setBusy(true);
    setSuggestions([]);
    const userBubble: Bubble = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
      cards: [],
      citations: [],
      tools: [],
    };
    const pendingId = `pending-${Date.now()}`;
    setMessages((current) => [
      ...current,
      userBubble,
      {
        id: pendingId,
        role: "assistant",
        content: "",
        cards: [],
        citations: [],
        tools: [],
      },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
      });
      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => ({ error: "The desk didn’t answer." }));
        throw new Error(detail.error ?? "The desk didn’t answer.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      const cards: Card[] = [];
      const citations: Citation[] = [];
      const tools: ToolTrace[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as {
            type: string;
            text?: string;
            conversationId?: string;
            tools?: ToolTrace[];
            card?: Card;
            citation?: Citation;
            suggestions?: string[];
          };
          if (event.type === "meta" && event.conversationId) {
            setConversationId(event.conversationId);
            if (event.tools) tools.push(...event.tools);
          }
          if (event.type === "card" && event.card) cards.push(event.card);
          if (event.type === "citation" && event.citation) citations.push(event.citation);
          if (event.type === "token" && event.text) assembled += event.text;
          if (event.type === "suggestions" && event.suggestions) setSuggestions(event.suggestions);
          setMessages((current) =>
            current.map((bubble) =>
              bubble.id === pendingId ? { ...bubble, content: assembled, cards: [...cards], citations: [...citations], tools: [...tools] } : bubble,
            ),
          );
        }
      }
      requestAnimationFrame(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (caught) {
      setMessages((current) => current.filter((bubble) => bubble.id !== pendingId));
      setError(caught instanceof Error ? caught.message : "The desk didn’t answer.");
    } finally {
      setBusy(false);
      onPromptConsumed?.();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  useEffect(() => {
    rootRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  useEffect(() => {
    if (!pendingPrompt) {
      launched.current = null;
      return;
    }
    if (launched.current === pendingPrompt) return;
    launched.current = pendingPrompt;
    onPromptConsumed?.();
    void send(pendingPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  return (
    <section
      ref={rootRef}
      className="flex h-[min(760px,calc(100dvh-6.5rem))] flex-col overflow-hidden rounded-3xl bg-card shadow-[0_20px_60px_-30px_rgba(27,58,50,0.45)] ring-1 ring-border"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-heading text-xl text-kelp">Rowan</p>
          <p className="text-xs text-muted-foreground">Support assistant · tools run in the shop ledger</p>
        </div>
        <button
          type="button"
          className="text-xs text-tide underline-offset-2 hover:underline"
          onClick={() => {
            setMessages([greeting]);
            setConversationId(null);
            setSuggestions(STARTER_PROMPTS);
            setError(null);
          }}
        >
          New chat
        </button>
      </div>
      <div ref={logRef} data-testid="chat-log" className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                message.role === "user"
                  ? "max-w-[90%] rounded-2xl rounded-br-md bg-kelp px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[95%] rounded-2xl rounded-bl-md bg-background px-3 py-2 text-sm ring-1 ring-border"
              }
            >
              {message.role === "assistant" && message.content === "" ? (
                <p className="text-muted-foreground">Checking the warehouse ledger…</p>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
              {message.role === "assistant" ? <RichCards cards={message.cards} /> : null}
              {message.tools.length > 0 ? (
                <p data-testid="tool-trace" className="mt-2 text-[11px] uppercase tracking-wide text-tide">
                  {message.tools.map((tool) => tool.summary).join(" · ")}
                </p>
              ) : null}
              {message.citations.length > 0 ? (
                <p className="mt-2 flex flex-wrap gap-1">
                  {message.citations.map((citation) => (
                    <a
                      key={`${citation.slug}-${citation.section}`}
                      href={`/policies#${citation.slug}`}
                      className="rounded-full bg-sand/80 px-2 py-0.5 text-[11px] text-kelp"
                    >
                      {citation.title}
                    </a>
                  ))}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {error ? (
        <div className="mx-4 mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          <button type="button" className="mt-1 underline" onClick={() => lastSent.current && void send(lastSent.current)}>
            Try that again
          </button>
        </div>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              data-testid="suggestion"
              disabled={busy}
              onClick={() => void send(suggestion)}
              className="shrink-0 rounded-full bg-sand px-3 py-1.5 text-left text-xs text-kelp hover:bg-sand/70 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          data-testid="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(draft);
            }
          }}
          placeholder="Ask about an order, a return, or a size…"
          rows={2}
          className="min-h-16 resize-none bg-foam"
        />
        <Button type="submit" data-testid="chat-send" disabled={busy || !draft.trim()} className="h-11 bg-copper text-white hover:bg-copper/90">
          Send
        </Button>
      </form>
    </section>
  );
}
