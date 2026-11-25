"use client";

import Link from "next/link";
import { money, prettyDateTime } from "@/lib/format";
import type { Card } from "@/lib/types";

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function RichCards({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="mt-3 grid gap-2">
      {cards.map((card, index) => {
        if (card.type === "order") {
          return (
            <article key={`order-${card.order.number}-${index}`} data-testid="order-card" className="rounded-xl bg-foam p-3 ring-1 ring-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-tide">Order</p>
                  <h3 className="font-heading text-lg text-kelp">{card.order.number}</h3>
                  <p className="text-xs text-muted-foreground">
                    {card.order.customerName} · {card.order.city}, {card.order.region}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-1 text-xs capitalize text-kelp">
                  {statusLabel(card.order.status)}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {card.order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.name}
                      <span className="text-muted-foreground"> · {item.size}</span>
                      {item.finalSale ? <span className="text-copper"> · final sale</span> : null}
                      {item.returnedRma ? <span className="text-tide"> · {item.returnedRma}</span> : null}
                    </span>
                    <span>{money(item.priceCents)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                {money(card.order.totalCents)} · {card.order.paymentMethod} · {card.order.shippingMethod}
              </p>
            </article>
          );
        }
        if (card.type === "tracking") {
          return (
            <article key={`track-${card.trackingNumber}`} data-testid="tracking-card" className="rounded-xl bg-foam p-3 ring-1 ring-border">
              <p className="text-xs uppercase tracking-wide text-tide">Tracking</p>
              <h3 className="font-heading text-lg text-kelp">{card.trackingNumber}</h3>
              <p className="text-xs text-muted-foreground">
                {card.carrier} · {statusLabel(card.status)}
              </p>
              <ol className="mt-3 space-y-3 border-l border-sand pl-3">
                {card.events.map((event) => (
                  <li key={`${event.at}-${event.code}`} className="relative">
                    <span className="absolute -left-[17px] top-1 size-2.5 rounded-full bg-copper" />
                    <p className="text-sm font-medium">{event.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {prettyDateTime(event.at)} · {event.location}
                    </p>
                    <p className="text-sm">{event.detail}</p>
                  </li>
                ))}
              </ol>
            </article>
          );
        }
        if (card.type === "return_label") {
          return (
            <article key={card.rma} data-testid="return-card" className="rounded-xl bg-kelp p-3 text-primary-foreground">
              <p className="text-xs uppercase tracking-wide text-sand">
                {card.kind === "exchange" ? "Exchange label" : "Return label"}
              </p>
              <h3 className="font-heading text-2xl">{card.rma}</h3>
              <p className="text-sm text-sand">
                {card.items.map((item) => item.name).join(", ")}
                {card.replacementSize ? ` → size ${card.replacementSize}` : ""}
              </p>
              <p className="mt-2 text-sm">
                Label fee {money(card.labelFeeCents)} · estimated refund {money(card.refundEstimateCents)}
              </p>
              <Link
                href={card.labelPath}
                className="mt-3 inline-flex rounded-full bg-sand px-3 py-1.5 text-sm font-medium text-kelp"
              >
                View label
              </Link>
            </article>
          );
        }
        if (card.type === "products") {
          return (
            <div key={`products-${index}`} className="grid gap-2">
              {card.products.map((product) => (
                <article key={product.sku} data-testid="product-card" className="rounded-xl bg-foam p-3 ring-1 ring-border">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-lg text-kelp">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.blurb}</p>
                    </div>
                    <p className="font-medium">{money(product.priceCents)}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {product.material} · sizes {product.sizes.join(", ")}
                    {product.finalSale ? " · final sale" : ""}
                  </p>
                </article>
              ))}
            </div>
          );
        }
        if (card.type === "coupon") {
          return (
            <article key={card.code} data-testid="coupon-card" className="rounded-xl border border-dashed border-copper bg-accent p-3">
              <p className="text-xs uppercase tracking-wide text-copper">Courtesy code · logged</p>
              <h3 className="font-heading text-2xl text-kelp">{card.code}</h3>
              <p className="text-sm">
                {card.percent}% off a future order, cap {money(card.capCents)}, on {card.orderNumber}.
              </p>
              <p className="text-xs text-muted-foreground">{card.reason}</p>
            </article>
          );
        }
        if (card.type === "ticket") {
          return (
            <article key={card.id} data-testid="ticket-card" className="rounded-xl bg-accent p-3 ring-1 ring-copper/40">
              <p className="text-xs uppercase tracking-wide text-copper">Desk ticket · {card.priority}</p>
              <h3 className="font-heading text-xl text-kelp">{card.id}</h3>
              <p className="text-sm">{card.summary}</p>
            </article>
          );
        }
        return (
          <article key={`size-${card.productName}`} data-testid="size-card" className="rounded-xl bg-foam p-3 ring-1 ring-border">
            <p className="text-xs uppercase tracking-wide text-tide">Size</p>
            <h3 className="font-heading text-2xl text-kelp">
              {card.size} <span className="text-base font-normal text-muted-foreground">in {card.productName}</span>
            </h3>
            <p className="text-sm">{card.note}</p>
          </article>
        );
      })}
    </div>
  );
}
