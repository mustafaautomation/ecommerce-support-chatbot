"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminInbox } from "@/components/admin-inbox";
import { RichCards } from "@/components/rich-cards";
import { useFetch } from "@/components/use-fetch";
import { BRAND } from "@/lib/brand";
import type { Card, Citation, ToolTrace } from "@/lib/types";

type Payload = {
  conversation: { id: string; status: string; customer_email: string | null; summary: string | null };
  messages: {
    id: string;
    role: string;
    content: string;
    cards_json: string;
    citations_json: string;
    tools_json: string;
  }[];
};

export default function ConversationDetail() {
  const params = useParams<{ id: string }>();
  const { data, error, loading, reload } = useFetch<Payload>(`/api/admin/conversations/${params.id}`);
  const [joined, setJoined] = useState(false);
  if (loading) return <p className="text-sm text-muted-foreground">Loading the transcript…</p>;
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error ?? "Missing conversation."}{" "}
        <button className="underline" type="button" onClick={() => void reload()}>
          Retry
        </button>
      </p>
    );
  }
  return (
    <AdminInbox activeId={params.id}>
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-medium tracking-tight">{data.conversation.customer_email ?? "Guest"}</h2>
        <p className="text-sm text-muted-foreground">{data.conversation.status.replaceAll("_", " ")}</p>
        {data.conversation.summary ? <p className="mt-2 text-sm">{data.conversation.summary}</p> : null}
        <button
          type="button"
          className="mt-3 inline-flex h-9 items-center rounded-full bg-accent px-3 text-sm text-accent-foreground"
          onClick={() => setJoined(true)}
        >
          Join as {BRAND.human}
        </button>
        <button
          type="button"
          data-testid="resume-bot"
          className="ml-2 mt-3 inline-flex h-9 items-center rounded-full border border-border px-3 text-sm"
          onClick={() => {
            void fetch(`/api/admin/conversations/${params.id}/resume`, { method: "POST" }).then(() => setJoined(false));
          }}
        >
          Resume bot
        </button>
        {joined ? <p className="mt-2 text-sm">{BRAND.human} joined · human specialist</p> : null}
      </header>
      <div className="space-y-3">
        {data.messages.map((message) => {
          const cards = JSON.parse(message.cards_json) as Card[];
          const tools = JSON.parse(message.tools_json) as ToolTrace[];
          const citations = JSON.parse(message.citations_json) as Citation[];
          return (
            <article key={message.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-xs uppercase tracking-wide text-tide">{message.role}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>
              <RichCards cards={cards} />
              {tools.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{tools.map((tool) => `${tool.name}: ${tool.summary}`).join(" · ")}</p>
              ) : null}
              {citations.length > 0 ? (
                <p className="mt-1 text-xs text-tide">{citations.map((citation) => citation.title).join(" · ")}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
    </AdminInbox>
  );
}
