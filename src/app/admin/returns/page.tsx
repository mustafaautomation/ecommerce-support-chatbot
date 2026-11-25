"use client";

import Link from "next/link";
import { useFetch } from "@/components/use-fetch";
import { money, prettyDateTime } from "@/lib/format";
import type { OrderItem } from "@/lib/types";

type ReturnRow = {
  rma: string;
  order_number: string;
  email: string;
  items_json: string;
  reason: string;
  kind: string;
  status: string;
  label_fee_cents: number;
  refund_cents: number | null;
  created_at: string;
};

const STATUSES = ["label_issued", "in_transit", "received", "refund_issued", "refunded", "cancelled"];

export default function ReturnsPage() {
  const { data, error, loading, reload } = useFetch<{ returns: ReturnRow[] }>("/api/admin/returns");

  async function update(rma: string, status: string) {
    await fetch(`/api/admin/returns/${rma}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await reload();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading returns…</p>;
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
  const rows = data?.returns ?? [];
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-card p-6 text-sm ring-1 ring-border">
        No returns yet. Start one from the shop chat and it will land in this queue with an RMA.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const items = JSON.parse(row.items_json) as OrderItem[];
        return (
          <article key={row.rma} className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl text-kelp">{row.rma}</h2>
                <p className="text-sm text-muted-foreground">
                  {row.order_number} · {row.email} · {row.kind} · {row.reason.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-sm">{items.map((item) => item.name).join(", ")}</p>
                <p className="text-xs text-muted-foreground">
                  {prettyDateTime(row.created_at)} · fee {money(row.label_fee_cents)} · refund{" "}
                  {row.refund_cents != null ? money(row.refund_cents) : "—"}
                </p>
              </div>
              <Link href={`/labels/${row.rma}`} className="text-sm text-tide underline">
                Label
              </Link>
            </div>
            <label className="mt-3 block text-xs text-muted-foreground">
              Queue status
              <select
                className="mt-1 block rounded-lg border border-border bg-foam px-2 py-1 text-sm text-foreground"
                value={row.status}
                onChange={(event) => void update(row.rma, event.target.value)}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </article>
        );
      })}
    </div>
  );
}
