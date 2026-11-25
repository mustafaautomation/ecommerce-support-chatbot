"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { RichCards, SlotChips } from "@/components/rich-cards";
import { SiteHeader } from "@/components/site-header";
import { BRAND, METRICS } from "@/lib/brand";
import { PRODUCTS } from "@/lib/catalog";
import { DEMO_SHOPPERS } from "@/lib/demo";
import { money } from "@/lib/format";
import type { Card } from "@/lib/types";

const featured = PRODUCTS.filter((product) => !product.finalSale).slice(0, 3);

const gallery: Card[] = [
  {
    type: "tracking",
    orderNumber: "DW-10482",
    carrier: "Northline",
    trackingNumber: "NL-8842193",
    status: "delivered",
    events: [
      { at: "2026-11-20T18:00:00.000Z", code: "labeled", label: "Labeled", location: "Grayhaven, OR", detail: "The shell and beanie left the bench." },
      { at: "2026-11-22T18:00:00.000Z", code: "out", label: "Out for delivery", location: "Portland, OR", detail: "On the local Northline van." },
      { at: "2026-11-23T18:00:00.000Z", code: "delivered", label: "Delivered", location: "Portland, OR", detail: "Left at the door." },
    ],
  },
  { type: "products", products: featured },
];

const TRY_ASKING = [
  "Where is my order #DW-10482?",
  "What’s your return policy?",
  "What size rain shell should I get?",
];

export default function HomePage() {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [preview, setPreview] = useState<"desktop" | "phone">("desktop");
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    function onAlert(event: Event) {
      const detail = (event as CustomEvent<{ urgent?: boolean; message?: string }>).detail;
      setAlert(detail?.urgent ? "Desk alerted" : `New human support request · ${detail?.message ?? "a shopper"}`);
      window.setTimeout(() => setAlert(null), 6000);
    }
    window.addEventListener("driftwood-desk-alert", onAlert);
    return () => window.removeEventListener("driftwood-desk-alert", onAlert);
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Portfolio demo · fictional brand</p>
            <h1 className="font-heading max-w-xl text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              The desk that can find the <span className="italic">parcel</span>.
            </h1>
            <p className="max-w-xl text-lg leading-7 text-muted-foreground">
              Rowan looks up Driftwood orders, starts returns, and answers from the shop’s own notes. Tracking, labels, and coupons are simulated.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
                onClick={() => {
                  document.getElementById("live-chat")?.scrollIntoView({ behavior: "smooth" });
                  setPrompt("Where is my order #DW-10482?");
                }}
              >
                Chat now
              </button>
              <a href="/embed-demo" className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-medium">
                See the embed
              </a>
            </div>
            <p className="text-sm text-muted-foreground">Orders open only with the number and the checkout email. Nothing here is a real carrier.</p>
            <div className="flex flex-wrap gap-2" data-testid="try-asking">
              <span className="text-xs text-muted-foreground">Try asking</span>
              {TRY_ASKING.map((chip) => (
                <button key={chip} type="button" className="rounded-full border border-border bg-surface px-3 py-1 text-[13px]" onClick={() => setPrompt(chip)}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
          <div id="live-chat" className="space-y-4 lg:sticky lg:top-20">
            <div className="flex gap-2 text-xs">
              <button type="button" className={`rounded-full px-3 py-1 ${preview === "desktop" ? "bg-accent text-accent-foreground" : "border border-border"}`} onClick={() => setPreview("desktop")}>Desktop</button>
              <button type="button" className={`rounded-full px-3 py-1 ${preview === "phone" ? "bg-accent text-accent-foreground" : "border border-border"}`} onClick={() => setPreview("phone")}>Phone</button>
            </div>
            <div className={preview === "phone" ? "mx-auto w-[375px] max-w-full" : ""}>
              <ChatPanel frame pendingPrompt={prompt} onPromptConsumed={() => setPrompt(null)} />
            </div>
            <aside data-testid="trust-panel" className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
                <p className="text-xs font-semibold uppercase tracking-wide">What it does</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>Tracks orders after the checkout email ✓</li>
                  <li>Starts returns and shows the label ✓</li>
                  <li>Cites the shop notes ✓</li>
                  <li>Hands damage and disputes to the desk ✓</li>
                </ul>
              </div>
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
                <p className="text-xs font-semibold uppercase tracking-wide">What it won’t do</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>Invent prices or refund amounts ✕</li>
                  <li>Give medical, legal, or financial advice ✕</li>
                  <li>Pretend to be a human ✕</li>
                  <li>Promise arrival times the carrier did not send ✕</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
        {alert ? (
          <p role="status" data-testid="desk-toast" className="fixed bottom-24 left-4 z-50 max-w-sm rounded-2xl bg-foreground px-4 py-3 text-sm text-background shadow-lg">
            {alert}
          </p>
        ) : null}

        <section data-testid="metrics-strip" className="mt-12 grid grid-cols-2 gap-4 border-y border-border py-6 sm:grid-cols-4">
          {METRICS.map((metric) => (
            <div key={metric.label}>
              <p className="text-[28px] font-semibold leading-none tracking-tight">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </section>

        <section id="how-it-works" className="mt-12">
          <h2 className="text-2xl font-medium tracking-tight">How it works</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["Channel", "Web chat, the embed, WhatsApp, or Messenger"],
              ["Retrieve", "BM25 plus a local hashed embedding over /kb"],
              ["Tools", "Orders, labels, and coupons are decided in code"],
              ["Desk", "Low confidence and sensitive cases become tickets"],
            ].map(([title, copy], index) => (
              <li key={title} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <p className="text-sm font-semibold">{index + 1}. {title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-medium tracking-tight">Try a shopper</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {DEMO_SHOPPERS.map((shopper) => (
              <button
                key={shopper.order}
                type="button"
                onClick={() => setPrompt(`Where is my order #${shopper.order}?`)}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-3 text-left hover:bg-accent-soft"
              >
                <p className="font-medium">
                  {shopper.name} · {shopper.order}
                </p>
                <p className="text-xs text-muted-foreground">{shopper.email}</p>
                <p className="mt-1 text-sm text-muted-foreground">{shopper.note}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-medium tracking-tight">What the thread can show</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <RichCards cards={gallery} />
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
              <SlotChips />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {featured.map((product) => (
              <button
                key={product.sku}
                type="button"
                onClick={() => setPrompt(`Tell me about the ${product.name} and what size to get.`)}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-3 text-left"
              >
                <p className="font-medium">{product.name}</p>
                <p className="font-mono text-sm tabular-nums">{money(product.priceCents)}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-medium tracking-tight">Embed snippet</h2>
          <pre className="mt-3 overflow-x-auto rounded-[var(--radius-card)] bg-accent p-4 font-mono text-xs text-accent-foreground">
            {`<script src="https://shop-chat.quvantic.com/widget.js" data-title="Driftwood support" async></script>`}
          </pre>
          <p className="mt-4 text-xs text-muted-foreground">{BRAND.disclaimer}</p>
        </section>
      </main>
    </>
  );
}
