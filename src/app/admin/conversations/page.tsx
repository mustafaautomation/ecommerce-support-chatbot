"use client";

import Link from "next/link";
import { useFetch } from "@/components/use-fetch";
import { prettyDateTime } from "@/lib/format";

type Conversation = {
  id: string;
  updated_at: string;
  customer_email: string | null;
  status: string;
  summary: string | null;
};

export default function ConversationsPage() {
  const { data, error, loading, reload } = useFetch<{ conversations: Conversation[] }>(
    "/api/admin/conversations",
  );
  if (loading) return <p className="text-sm text-muted-foreground">Loading conversations…</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error}{" "}
        <button className="underline" type="button" onClick={() => void reload()}>
          Retry
        </button>
      </p>
    );
  }
  const rows = data?.conversations ?? [];
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-card p-6 text-sm ring-1 ring-border">
        No chats yet. The shop chat writes each turn here, including the tools Rowan called.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <Link
          key={row.id}
          href={`/admin/conversations/${row.id}`}
          className="block rounded-2xl bg-card p-4 ring-1 ring-border hover:ring-tide"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-kelp">{row.customer_email ?? "Guest, email not given"}</p>
            <p className="text-xs uppercase tracking-wide text-tide">{row.status.replaceAll("_", " ")}</p>
          </div>
          <p className="text-sm text-muted-foreground">{row.summary ?? "No handoff summary."}</p>
          <p className="text-xs text-muted-foreground">{prettyDateTime(row.updated_at)}</p>
        </Link>
      ))}
    </div>
  );
}
