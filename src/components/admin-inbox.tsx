"use client";

import type { ReactNode } from "react";
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

export function AdminInbox({ activeId, children }: { activeId?: string; children: ReactNode }) {
  const { data, error, loading, reload } = useFetch<{ conversations: Conversation[] }>("/api/admin/conversations");
  const rows = data?.conversations ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">Inbox</p>
        {loading ? <p className="p-3 text-sm text-muted-foreground">Loading conversations…</p> : null}
        {error ? (
          <p className="p-3 text-sm text-danger">
            {error}{" "}
            <button type="button" className="underline" onClick={() => void reload()}>
              Retry
            </button>
          </p>
        ) : null}
        {rows.length === 0 && !loading ? <p className="p-3 text-sm text-muted-foreground">No chats yet.</p> : null}
        <ul>
          {rows.map((row) => {
            const unread = row.status !== "resolved";
            return (
              <li key={row.id}>
                <Link
                  href={`/admin/conversations/${row.id}`}
                  className={`block border-b border-border px-3 py-3 text-sm ${activeId === row.id ? "bg-accent text-accent-foreground" : unread ? "bg-accent-soft" : "hover:bg-muted"}`}
                >
                  <span className="block font-medium">{row.customer_email ?? "Guest, email not given"}</span>
                  <span className={`block text-xs ${activeId === row.id ? "text-accent-foreground/80" : "text-muted-foreground"}`}>
                    {row.summary ?? row.status.replaceAll("_", " ")} · {prettyDateTime(row.updated_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
      <section className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-4">{children}</section>
    </div>
  );
}
