"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { SiteHeader } from "@/components/site-header";
import { PRODUCTS } from "@/lib/catalog";
import { DEMO_SHOPPERS } from "@/lib/demo";
import { money } from "@/lib/format";

const featured = PRODUCTS.filter((product) => !product.finalSale).slice(0, 3);

export default function HomePage() {
  const [prompt, setPrompt] = useState<string | null>(null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="order-2 space-y-6 lg:order-1">
          <section className="rounded-3xl bg-kelp px-6 py-8 text-primary-foreground">
            <p className="text-xs uppercase tracking-[0.2em] text-sand">Portfolio demo · fictional brand</p>
            <h1 className="font-heading mt-2 max-w-xl text-4xl leading-tight sm:text-5xl">
              The desk that can find the parcel.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-sand sm:text-base">
              Rowan looks up Driftwood orders, starts returns, and answers from the shop’s own notes.
              Tracking, labels, and coupons are simulated. Nothing here is a real carrier or a real charge.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl text-kelp">Try a shopper</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The main path is Maya’s order: ask where it is, confirm the email, then return the beanie.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {DEMO_SHOPPERS.map((shopper) => (
                <button
                  key={shopper.order}
                  type="button"
                  onClick={() => setPrompt(`Where is my order #${shopper.order}?`)}
                  className="rounded-2xl bg-card p-3 text-left ring-1 ring-border hover:ring-tide"
                >
                  <p className="font-medium text-kelp">
                    {shopper.name} · {shopper.order}
                  </p>
                  <p className="text-xs text-tide">{shopper.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{shopper.note}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-2xl text-kelp">On the rail this week</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {featured.map((product) => (
                <button
                  key={product.sku}
                  type="button"
                  onClick={() => setPrompt(`Tell me about the ${product.name} and what size to get.`)}
                  className="rounded-2xl bg-card p-3 text-left ring-1 ring-border hover:ring-tide"
                >
                  <div className="mb-3 h-16 rounded-xl bg-gradient-to-br from-kelp via-tide to-sand" />
                  <p className="font-heading text-lg leading-tight text-kelp">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{money(product.priceCents)}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 ring-1 ring-border" aria-labelledby="under-the-hood">
            <h2 id="under-the-hood" className="font-heading text-2xl text-kelp">
              Under the hood
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Groq (<code>llama-3.3-70b-versatile</code>) calls the tools when <code>GROQ_API_KEY</code> is set.
              Gemini is the fallback. With no key, Rowan uses the same tools through a deterministic offline engine, so this demo and CI never depend on a provider.
            </p>
            <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
              {[
                ["1. Channel", "Web chat, the embed, WhatsApp, or Messenger"],
                ["2. Retrieve", "BM25 plus a local hashed embedding over /kb"],
                ["3. Tools", "Orders, labels, and coupons are decided in code"],
                ["4. Desk", "Low confidence and sensitive cases become tickets"],
              ].map(([title, copy]) => (
                <li key={title} className="rounded-2xl bg-foam p-3 ring-1 ring-border">
                  <p className="font-medium text-kelp">{title}</p>
                  <p className="mt-1 text-muted-foreground">{copy}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="order-1 lg:sticky lg:top-4 lg:order-2">
          <ChatPanel pendingPrompt={prompt} onPromptConsumed={() => setPrompt(null)} />
        </div>
      </main>
    </>
  );
}
