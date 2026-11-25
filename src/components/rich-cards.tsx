"use client";

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { money, prettyDateTime } from "@/lib/format";
import type { Card } from "@/lib/types";

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function Mono({ children }: { children: string }) {
  return <span className="font-mono text-[13px] tabular-nums">{children}</span>;
}

export function RichCards({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="mt-3 grid gap-2">
      {cards.map((card, index) => {
        if (card.type === "order") {
          return (
            <article
              key={`order-${card.order.number}-${index}`}
              data-testid="order-card"
              className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11.5px] text-muted-foreground">Order receipt</p>
                  <h3 className="text-sm font-semibold tracking-tight">
                    <Mono>{card.order.number}</Mono>
                  </h3>
                  <p className="text-[11.5px] text-muted-foreground">
                    {card.order.customerName} · {card.order.city}, {card.order.region}
                  </p>
                </div>
                <span className="rounded-full bg-accent-soft px-2 py-1 text-[11.5px] capitalize text-accent">
                  {statusLabel(card.order.status)}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {card.order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.name}
                      <span className="text-muted-foreground"> · {item.size}</span>
                      {item.finalSale ? <span className="text-sale"> · final sale</span> : null}
                    </span>
                    <Mono>{money(item.priceCents)}</Mono>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-border pt-2 text-[11.5px] text-muted-foreground">
                <Mono>{money(card.order.totalCents)}</Mono> · {card.order.paymentMethod} · {card.order.shippingMethod}
              </p>
            </article>
          );
        }
        if (card.type === "tracking") {
          const current = card.events.length - 1;
          return (
            <article
              key={`track-${card.trackingNumber}`}
              data-testid="tracking-card"
              className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
            >
              <div data-testid="card-timeline">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11.5px] text-muted-foreground">Package location</p>
                    <h3 className="text-sm font-semibold">
                      <Mono>{card.trackingNumber}</Mono>
                    </h3>
                    <p className="text-[11.5px] text-muted-foreground">
                      {card.carrier} · {card.orderNumber}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent-soft px-2 py-1 text-[11.5px] capitalize text-accent">
                    {statusLabel(card.status)}
                  </span>
                </div>
                <ol className="mt-3 space-y-3 border-l-2 border-muted pl-3">
                  {card.events.map((event, eventIndex) => (
                    <li key={`${event.at}-${event.code}`} className="relative">
                      <span
                        className={`absolute -left-[17px] top-1 size-3 rounded-full ring-2 ring-surface ${
                          eventIndex === current ? "bg-accent" : "bg-success"
                        }`}
                      />
                      <p className="text-sm font-medium">{event.label}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        <time dateTime={event.at}>{prettyDateTime(event.at)}</time>
                        {" · "}
                        {event.location}
                      </p>
                      <p className="text-sm text-foreground/90">{event.detail}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          );
        }
        if (card.type === "return_label") {
          return (
            <article
              key={card.rma}
              data-testid="return-card"
              className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
            >
              <div data-testid="card-confirm" className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                  <Check className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{card.kind === "exchange" ? "Exchange started" : "Return started"}</h3>
                  <p className="mt-1 font-mono text-[13px] tabular-nums">{card.rma}</p>
                  <p className="text-sm text-muted-foreground">
                    {card.items.map((item) => item.name).join(", ")}
                    {card.replacementSize ? ` → size ${card.replacementSize}` : ""}
                  </p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    Label fee {money(card.labelFeeCents)} · estimated refund {money(card.refundEstimateCents)}
                  </p>
                  <Link
                    href={card.labelPath}
                    className="mt-3 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-accent px-3 text-sm font-medium text-accent-foreground"
                  >
                    View label
                  </Link>
                  <SlotChips />
                </div>
              </div>
            </article>
          );
        }
        if (card.type === "products") {
          return <ProductCarousel key={`products-${index}`} products={card.products} />;
        }
        if (card.type === "coupon") {
          return (
            <article key={card.code} data-testid="coupon-card" className="rounded-[var(--radius-card)] border border-dashed border-sale bg-accent-soft p-3">
              <p className="text-[11.5px] text-sale">Courtesy code · logged</p>
              <h3 className="font-mono text-lg text-foreground">{card.code}</h3>
              <p className="text-sm">
                {card.percent}% off a future order, cap {money(card.capCents)}, on {card.orderNumber}.
              </p>
              <p className="text-[11.5px] text-muted-foreground">{card.reason}</p>
            </article>
          );
        }
        if (card.type === "ticket") {
          return (
            <article key={card.id} data-testid="ticket-card" className="rounded-[var(--radius-card)] border border-info/40 bg-surface p-3 shadow-[var(--shadow-card)]">
              <p className="text-[11.5px] text-info">Desk ticket · {card.priority}</p>
              <h3 className="font-mono text-sm">{card.id}</h3>
              <p className="mt-1 text-sm">
                I’m connecting you with the Driftwood desk. In this demo, the ticket appears in /admin. A specialist usually replies in a few minutes.
              </p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">{card.summary}</p>
            </article>
          );
        }
        return (
          <article key={`size-${card.productName}`} data-testid="size-card" className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
            <p className="text-[11.5px] text-muted-foreground">Size guidance</p>
            <h3 className="text-sm font-semibold">
              {card.size} <span className="font-normal text-muted-foreground">in {card.productName}</span>
            </h3>
            <p className="text-sm">{card.note}</p>
          </article>
        );
      })}
    </div>
  );
}

export function SlotChips() {
  const slots = ["Thu 10:00", "Thu 2:00", "Fri 11:00"];
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div data-testid="card-booking" className="mt-3">
      <p className="text-[11.5px] text-muted-foreground">Open times · Grayhaven counter</p>
      <p className="text-[11.5px] text-muted-foreground">Only times the booking system returned</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot}
            type="button"
            data-testid="slot-chip"
            aria-pressed={picked === slot}
            className={`h-9 rounded-full border px-3 text-[13px] font-medium ${picked === slot ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface"}`}
            onClick={() => setPicked(slot)}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductCarousel({ products }: { products: Extract<Card, { type: "products" }>["products"] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  function scrollBy(direction: number) {
    scroller.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }
  return (
    <div data-testid="card-carousel" className="relative">
      <div ref={scroller} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-4 [scrollbar-width:thin]">
        {products.map((product) => (
          <article
            key={product.sku}
            data-testid="product-card"
            className="w-[230px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)] dark:border-white/15"
          >
            <div className="aspect-[16/10] bg-gradient-to-br from-accent via-accent/70 to-sale/80" />
            <div className="p-3">
              <h3 className="truncate text-sm font-semibold">{product.name}</h3>
              <p className="font-mono text-[13px] tabular-nums">{money(product.priceCents)}</p>
              <p className="mt-1 line-clamp-2 text-[11.5px] text-muted-foreground">{product.blurb}</p>
              {product.finalSale ? (
                <span className="mt-2 inline-flex rounded-full bg-sale/15 px-2 py-0.5 text-[11px] text-sale">Final sale</span>
              ) : (
                <span className="mt-2 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">In stock</span>
              )}
              <button
                type="button"
                className="mt-3 inline-flex h-9 min-h-11 items-center text-sm font-medium text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  void navigator.clipboard?.writeText(product.sku);
                  setCopied(product.sku);
                  window.setTimeout(() => setCopied(null), 1500);
                }}
              >
                {copied === product.sku ? (
                  <>
                    <Copy className="mr-1 size-3" aria-hidden /> Copied SKU
                  </>
                ) : (
                  "View in shop"
                )}
              </button>
            </div>
          </article>
        ))}
      </div>
      <button
        type="button"
        aria-label="Previous products"
        className="absolute left-1 top-16 hidden size-7 place-items-center rounded-full border border-border bg-surface/90 shadow-sm hover:bg-surface md:grid"
        onClick={() => scrollBy(-1)}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Next products"
        className="absolute right-1 top-16 hidden size-7 place-items-center rounded-full border border-border bg-surface/90 shadow-sm hover:bg-surface md:grid"
        onClick={() => scrollBy(1)}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
