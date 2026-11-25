"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RichCards } from "@/components/rich-cards";
import { useFetch } from "@/components/use-fetch";
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
    <div className="space-y-4">
      <Link href="/admin/conversations" className="text-sm text-tide underline">
        All conversations
      </Link>
      <header>
        <h2 className="font-heading text-2xl text-kelp">{data.conversation.customer_email ?? "Guest"}</h2>
        <p className="text-sm text-muted-foreground">{data.conversation.status.replaceAll("_", " ")}</p>
        {data.conversation.summary ? <p className="mt-2 text-sm">{data.conversation.summary}</p> : null}
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
  );
}
