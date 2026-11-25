# Driftwood Outfitters — support desk

A portfolio demo of an AI customer-support assistant for **Driftwood Outfitters**, a fictional outdoor shop in Grayhaven, Oregon. The brand, the shoppers, the orders, and the carrier (Northline Freight) are invented. Nothing here charges a card or prints a real label.

The intended public host is [shop-chat.quvantic.com](https://shop-chat.quvantic.com). Locally it runs at http://127.0.0.1:3847.

## Run it

```bash
pnpm install
pnpm dev
```

Open http://127.0.0.1:3847. The operator desk is http://127.0.0.1:3847/admin. No API key is required. `LLM_PROVIDER` defaults to `mock`: a deterministic tool router. Copy `.env.example` if you want to point that router at an OpenAI-compatible model later. The tools still decide eligibility, money, and labels.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
```

The first request creates `data/driftwood.sqlite` and loads the seed orders. **Reset ledger** on the desk puts that seed back.

## What to try

Maya Chen, `maya.chen@example.com`, order **DW-10482**:

1. Ask “Where is my order #DW-10482?” Rowan asks for the checkout email and does not open the order.
2. Give the email. You get an order card and the Northline timeline for **NL-8842193**.
3. Return the Trail Wool Beanie. You get an RMA and a simulated label (HTML page plus a small PDF).

Other seeded paths:

| Shopper | Order | What it shows |
| --- | --- | --- |
| Jordan Hale | DW-10411 | Still processing, so it can be cancelled |
| Sam Okonkwo | DW-10390 | Out for delivery, cannot be cancelled |
| Priya Nair | DW-10220 | Delivered 48 days ago, outside the 30-day window |
| Elena Voss | DW-10770 | $420 parka. Damage opens a desk ticket, not a label |
| Noah Ellis | DW-10802 | Late delivery. One 10% courtesy code, cap $25, logged |
| Avery Quinn | DW-10088 | Refund already issued on RMA-1008 |
| Camille Bergeron | DW-10601 | In transit to Vancouver. Duties unpaid |

## How it is put together

Rowan retrieves shop notes with BM25 (shipping, international, 30-day returns, final sale, refunds, sizing, care, warranty, promos, payments, accounts) and cites the note. Order actions are tools. A matching order number **and** checkout email are required before any of them run. A wrong email gets the same reply as an unknown order.

| Tool | What the code does |
| --- | --- |
| `search_knowledge` | Retrieves notes. Weak matches are refused. |
| `lookup_order` / `track_shipment` | Reads the seed ledger and the carrier timeline |
| `start_return` | Checks the 30-day window, final sale, and label fee, then issues an RMA |
| `start_exchange` | Same checks, plus the replacement size. Ships when the return is scanned |
| `check_refund_status` | Reads returns already on the order |
| `product_search` / `size_recommendation` | Catalog cards and the shell chart |
| `apply_goodwill_coupon` | 10% / $25, one per order, only when a promise was missed by more than 2 days. Logged |
| `cancel_order` | Only while the order is still processing |
| `handoff_to_agent` | Opens a ticket with a summary. Later turns in that chat do not take more actions |

Handoff covers chargebacks and legal threats, damaged or missing high-value parcels (item at or above $250, or an order at or above $400), any missing parcel, and a second failed lookup.

Rich cards in the chat: order summary, tracking timeline, return label, product, size, coupon, and ticket. The desk lists returns (with a status queue), tickets, conversations (transcript plus tool trace), and the coupon audit.

## What is real and what is mocked

| Real | Mocked |
| --- | --- |
| Retrieval, policy checks, tool gating, the ledger, the admin queue | The carrier, the label PDF, payments, and inventory |
| The chat and desk UI | The people and the brand |

The optional model path is not required for the demo. If you set `LLM_PROVIDER` later, keep the same tools: prices, windows, and RMAs stay in code.
