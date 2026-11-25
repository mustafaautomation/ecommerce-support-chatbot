"use client";

import { useFetch } from "@/components/use-fetch";
import { money, prettyDateTime } from "@/lib/format";

type Payload = {
  coupons: {
    code: string;
    order_number: string;
    email: string;
    percent: number;
    cap_cents: number;
    reason: string;
    created_at: string;
  }[];
  audit: { id: number; at: string; action: string; detail: string }[];
};

export default function CouponsPage() {
  const { data, error, loading, reload } = useFetch<Payload>("/api/admin/coupons");
  if (loading) return <p className="text-sm text-muted-foreground">Loading the coupon log…</p>;
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error}{" "}
        <button className="underline" type="button" onClick={() => void reload()}>
          Retry
        </button>
      </p>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-2">
        <h2 className="font-heading text-2xl text-kelp">Courtesy codes</h2>
        {data.coupons.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm ring-1 ring-border">
            None issued. A late order can receive one 10% code, capped at $25, and it is written here.
          </p>
        ) : (
          data.coupons.map((coupon) => (
            <article key={coupon.code} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <h3 className="font-heading text-xl text-kelp">{coupon.code}</h3>
              <p className="text-sm">
                {coupon.percent}% · cap {money(coupon.cap_cents)} · {coupon.order_number}
              </p>
              <p className="text-xs text-muted-foreground">
                {coupon.email} · {coupon.reason} · {prettyDateTime(coupon.created_at)}
              </p>
            </article>
          ))
        )}
      </section>
      <section className="space-y-2">
        <h2 className="font-heading text-2xl text-kelp">Audit</h2>
        {data.audit.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm ring-1 ring-border">No writes yet.</p>
        ) : (
          data.audit.map((entry) => (
            <article key={entry.id} className="rounded-2xl bg-card p-3 text-sm ring-1 ring-border">
              <p className="font-medium text-kelp">{entry.action}</p>
              <p>{entry.detail}</p>
              <p className="text-xs text-muted-foreground">{prettyDateTime(entry.at)}</p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
