"use client";

import Link from "next/link";
import { useFetch } from "@/components/use-fetch";
import { prettyDateTime } from "@/lib/format";

type Ticket = {
  id: string;
  conversation_id: string;
  priority: string;
  reason: string;
  summary: string;
  status: string;
  note: string | null;
  created_at: string;
};

export default function TicketsPage() {
  const { data, error, loading, reload } = useFetch<{ tickets: Ticket[] }>("/api/admin/tickets");

  async function save(ticket: Ticket, status: string, note: string) {
    await fetch(`/api/admin/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    await reload();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading tickets…</p>;
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
  const tickets = data?.tickets ?? [];
  if (tickets.length === 0) {
    return (
      <p className="rounded-2xl bg-card p-6 text-sm ring-1 ring-border">
        No tickets. Chargebacks, damaged high-value parcels, missing shipments, and repeated failures open one with a summary.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <article key={ticket.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-xl text-kelp">{ticket.id}</h2>
            <p className="text-xs uppercase tracking-wide text-copper">
              {ticket.priority} · {ticket.reason.replaceAll("_", " ")}
            </p>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{ticket.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">{prettyDateTime(ticket.created_at)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-border bg-foam px-2 py-1 text-sm"
              value={ticket.status}
              onChange={(event) => void save(ticket, event.target.value, ticket.note ?? "")}
            >
              {["open", "pending", "resolved"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Link className="text-sm text-tide underline" href={`/admin/conversations/${ticket.conversation_id}`}>
              Conversation
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
