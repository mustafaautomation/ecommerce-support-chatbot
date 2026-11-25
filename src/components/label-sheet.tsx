"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { useFetch } from "@/components/use-fetch";
import { money } from "@/lib/format";
import type { OrderItem } from "@/lib/types";

type Label = {
  rma: string;
  orderNumber: string;
  customerName: string;
  city: string;
  region: string;
  country: string;
  carrier: string;
  reason: string;
  kind: string;
  status: string;
  labelFeeCents: number;
  refundCents: number | null;
  items: OrderItem[];
  replacementSize: string | null;
};

export default function LabelPage() {
  const params = useParams<{ rma: string }>();
  const { data, error, loading, reload } = useFetch<Label>(`/api/labels/${params.rma}/meta`);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-8">
        {loading ? <p className="text-sm text-muted-foreground">Printing the label…</p> : null}
        {error ? (
          <p className="text-sm text-destructive">
            {error}{" "}
            <button className="underline" type="button" onClick={() => void reload()}>
              Retry
            </button>
          </p>
        ) : null}
        {data ? (
          <article className="rounded-3xl bg-card p-6 ring-1 ring-border">
            <p className="text-xs uppercase tracking-[0.2em] text-tide">Simulated {data.carrier} label</p>
            <h1 className="font-heading mt-2 text-4xl text-kelp">{data.rma}</h1>
            <p className="text-sm text-muted-foreground">
              {data.kind} · {data.reason.replaceAll("_", " ")} · {data.status.replaceAll("_", " ")}
            </p>
            <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">From</p>
                <p className="font-medium">{data.customerName}</p>
                <p>
                  {data.city}, {data.region} {data.country}
                </p>
                <p>{data.orderNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">To</p>
                <p className="font-medium">Driftwood Returns</p>
                <p>410 Harbor Yard</p>
                <p>Grayhaven, OR 97000</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm">
              {data.items.map((item) => (
                <li key={item.id}>
                  {item.name} · {item.size}
                </li>
              ))}
            </ul>
            {data.replacementSize ? <p className="mt-2 text-sm">Replacement size {data.replacementSize}</p> : null}
            <p className="mt-4 text-sm">
              Label fee {money(data.labelFeeCents)} · estimated refund{" "}
              {data.refundCents != null ? money(data.refundCents) : "—"}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              This PDF is a demo artifact. Northline Freight is not a real carrier, and the barcode is not scannable.
            </p>
            <div className="mt-4 flex gap-3">
              <a className="rounded-full bg-kelp px-4 py-2 text-sm text-primary-foreground" href={`/api/labels/${data.rma}`}>
                Download PDF
              </a>
              <Link className="rounded-full px-4 py-2 text-sm text-tide underline" href="/">
                Back to chat
              </Link>
            </div>
          </article>
        ) : null}
      </main>
    </>
  );
}
