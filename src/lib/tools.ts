import { productBySku, searchProducts } from "@/lib/catalog";
import type { Store } from "@/lib/db";
import { logSafe, maskPii } from "@/lib/pii";
import { couponCode, nextNumber } from "@/lib/ids";
import { findVerifiedOrder, saveOrder, shipmentEvents } from "@/lib/orders";
import {
  canCancel,
  goodwillDecision,
  isHighValueClaim,
  labelFeeCents,
  recommendApparelSize,
  returnBlocker,
} from "@/lib/policy";
import { retrieve } from "@/lib/retrieve";
import type {
  Card,
  OrderItem,
  ReturnReason,
  TicketPriority,
} from "@/lib/types";

export type ToolOk = {
  ok: true;
  summary: string;
  cards: Card[];
  data?: Record<string, unknown>;
};

export type ToolFail = {
  ok: false;
  summary: string;
  message: string;
  handoff?: { reason: string; priority: TicketPriority };
  cards?: Card[];
};

export type ToolOutcome = ToolOk | ToolFail;

function miss(orderNumber: string): ToolFail {
  return {
    ok: false,
    summary: `No match for ${orderNumber}`,
    message: `I couldn’t find an order ${orderNumber} with that email. Check the number on the receipt and the address used at checkout. I won’t open an order on a partial match.`,
  };
}

export function toolLookup(store: Store, orderNumber: string, email: string): ToolOutcome {
  const order = findVerifiedOrder(store, orderNumber, email);
  if (!order) return miss(orderNumber);
  return {
    ok: true,
    summary: `Looked up ${order.number}`,
    cards: [{ type: "order", order }],
    data: { order },
  };
}

export function toolTrack(store: Store, orderNumber: string, email: string): ToolOutcome {
  const order = findVerifiedOrder(store, orderNumber, email);
  if (!order) return miss(orderNumber);
  const events = shipmentEvents(store, order.number);
  if (!order.trackingNumber || events.length === 0) {
    return {
      ok: true,
      summary: `${order.number} has no carrier scan yet`,
      cards: [{ type: "order", order }],
      data: { order, events: [] },
    };
  }
  return {
    ok: true,
    summary: `Pulled tracking ${order.trackingNumber}`,
    cards: [
      { type: "order", order },
      {
        type: "tracking",
        orderNumber: order.number,
        carrier: order.carrier ?? "Northline Freight",
        trackingNumber: order.trackingNumber,
        status: order.status,
        events,
      },
    ],
    data: { order, events },
  };
}

function resolveItems(orderItems: OrderItem[], itemIds: string[]): OrderItem[] {
  const wanted = new Set(itemIds);
  return orderItems.filter((item) => wanted.has(item.id));
}

export function toolStartReturn(
  store: Store,
  input: {
    orderNumber: string;
    email: string;
    itemIds: string[];
    reason: ReturnReason;
    conversationId: string | null;
    kind?: "return" | "exchange";
    replacementSize?: string;
  },
): ToolOutcome {
  const order = findVerifiedOrder(store, input.orderNumber, input.email);
  if (!order) return miss(input.orderNumber);
  const items = resolveItems(order.items, input.itemIds);
  if (items.length === 0) {
    return {
      ok: false,
      summary: "No matching items",
      message: `I couldn’t match those items on ${order.number}.`,
    };
  }
  if (
    (input.reason === "damaged" || input.reason === "defective" || input.reason === "missing") &&
    isHighValueClaim(order, items)
  ) {
    return {
      ok: false,
      summary: "High-value claim needs a person",
      message: "This is a high-value damage or missing-parcel claim, so I’m handing it to the desk instead of issuing a label.",
      handoff: {
        reason: input.reason === "missing" ? "missing_high_value" : "damaged_high_value",
        priority: "high",
      },
    };
  }
  const blockers = items
    .map((item) => returnBlocker(order, item, input.reason))
    .filter((blocker): blocker is string => Boolean(blocker));
  if (blockers.length > 0) {
    return {
      ok: false,
      summary: "Return not eligible",
      message: blockers[0],
    };
  }
  const fee = labelFeeCents(input.reason);
  const merchandise = items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
  const refund = Math.max(0, merchandise - fee);
  const rma = nextNumber(store, "rma", "RMA-", 2401);
  const now = new Date().toISOString();
  const kind = input.kind ?? "return";
  store.run(
    `INSERT INTO returns (
      rma, order_number, email, items_json, reason, kind, replacement_size, status,
      label_fee_cents, refund_cents, created_at, received_at, refund_issued_at, conversation_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rma,
      order.number,
      order.email,
      JSON.stringify(items),
      input.reason,
      kind,
      input.replacementSize ?? null,
      "label_issued",
      fee,
      refund,
      now,
      null,
      null,
      input.conversationId,
    ],
  );
  order.items = order.items.map((item) =>
    items.some((chosen) => chosen.id === item.id) ? { ...item, returnedRma: rma } : item,
  );
  saveOrder(store, order);
  const returnAction = kind === "exchange" ? "start_exchange" : "start_return";
  const returnDetail = maskPii(`${rma} on ${order.number} for ${items.map((item) => item.name).join(", ")}`);
  store.run("INSERT INTO audit (at, action, detail) VALUES (?, ?, ?)", [now, returnAction, returnDetail]);
  logSafe(returnAction, returnDetail);
  const card: Card = {
    type: "return_label",
    rma,
    orderNumber: order.number,
    kind,
    items,
    reason: input.reason,
    labelFeeCents: fee,
    refundEstimateCents: refund,
    replacementSize: input.replacementSize,
    labelPath: `/labels/${rma}`,
    status: "label_issued",
  };
  return {
    ok: true,
    summary: `Issued ${rma}`,
    cards: [{ type: "order", order }, card],
    data: { rma, fee, refund },
  };
}

export function toolRefundStatus(store: Store, orderNumber: string, email: string): ToolOutcome {
  const order = findVerifiedOrder(store, orderNumber, email);
  if (!order) return miss(orderNumber);
  const rows = store.all<{
    rma: string;
    status: string;
    refund_cents: number | null;
    refund_issued_at: string | null;
    reason: string;
    items_json: string;
  }>("SELECT * FROM returns WHERE order_number = ? ORDER BY created_at DESC", [order.number]);
  if (rows.length === 0) {
    return {
      ok: true,
      summary: `No refund open on ${order.number}`,
      cards: [{ type: "order", order }],
      data: { returns: [] },
    };
  }
  return {
    ok: true,
    summary: `Checked refund on ${rows[0].rma}`,
    cards: [{ type: "order", order }],
    data: { returns: rows, payment: order.paymentMethod },
  };
}

export function toolCancel(
  store: Store,
  orderNumber: string,
  email: string,
): ToolOutcome {
  const order = findVerifiedOrder(store, orderNumber, email);
  if (!order) return miss(orderNumber);
  const blocker = canCancel(order);
  if (blocker) return { ok: false, summary: "Cancellation refused", message: blocker };
  order.status = "cancelled";
  saveOrder(store, order);
  const now = new Date().toISOString();
  const cancelDetail = maskPii(`${order.number} cancelled before a label was created`);
  store.run("INSERT INTO audit (at, action, detail) VALUES (?, ?, ?)", [now, "cancel_order", cancelDetail]);
  logSafe("cancel_order", cancelDetail);
  return {
    ok: true,
    summary: `Cancelled ${order.number}`,
    cards: [{ type: "order", order }],
  };
}

export function toolGoodwill(
  store: Store,
  input: { orderNumber: string; email: string; note: string; conversationId: string | null },
): ToolOutcome {
  const order = findVerifiedOrder(store, input.orderNumber, input.email);
  if (!order) return miss(input.orderNumber);
  const existing = store.get<{ code: string }>("SELECT code FROM coupons WHERE order_number = ?", [
    order.number,
  ]);
  const decision = goodwillDecision(order, input.note, Boolean(existing));
  if (!decision.ok) {
    return {
      ok: false,
      summary: "Courtesy code refused",
      message: decision.message,
      handoff: decision.handoff
        ? { reason: "goodwill_over_limit", priority: "normal" }
        : undefined,
    };
  }
  const code = couponCode();
  const now = new Date().toISOString();
  store.run(
    `INSERT INTO coupons (code, order_number, email, percent, cap_cents, reason, conversation_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      order.number,
      order.email,
      decision.percent,
      decision.capCents,
      decision.reason,
      input.conversationId,
      now,
    ],
  );
  const couponDetail = maskPii(`${code} on ${order.number}: ${decision.percent}% cap ${decision.capCents}`);
  store.run("INSERT INTO audit (at, action, detail) VALUES (?, ?, ?)", [
    now,
    "apply_goodwill_coupon",
    couponDetail,
  ]);
  logSafe("apply_goodwill_coupon", couponDetail);
  return {
    ok: true,
    summary: `Issued ${code}`,
    cards: [
      {
        type: "coupon",
        code,
        percent: decision.percent,
        capCents: decision.capCents,
        orderNumber: order.number,
        reason: decision.reason,
      },
    ],
  };
}

export function toolProducts(query: string): ToolOutcome {
  const products = searchProducts(query, 3);
  if (products.length === 0) {
    return {
      ok: false,
      summary: "No catalog match",
      message: "I couldn’t find that in the current Driftwood catalog.",
    };
  }
  return {
    ok: true,
    summary: `Found ${products.map((product) => product.name).join(", ")}`,
    cards: [{ type: "products", products }],
  };
}

export function toolSize(input: {
  query: string;
  heightIn?: number;
  usualSize?: string;
  layering: boolean;
}): ToolOutcome {
  const products = searchProducts(input.query, 1);
  const product = products[0] ?? productBySku("SHELL-CEDAR");
  if (!product) {
    return { ok: false, summary: "No product", message: "I need a product name to recommend a size." };
  }
  if (product.category === "beanies" || product.sizes.length === 1) {
    return {
      ok: true,
      summary: `${product.name} is one size`,
      cards: [
        {
          type: "size",
          productName: product.name,
          size: product.sizes[0] ?? "OS",
          note: "The Trail Wool Beanie is one size for a 21–24 inch head.",
        },
        { type: "products", products: [product] },
      ],
    };
  }
  if (product.category === "pants" || product.category === "footwear") {
    return {
      ok: true,
      summary: `Sizing note for ${product.name}`,
      cards: [
        {
          type: "size",
          productName: product.name,
          size: input.usualSize ?? product.sizes[Math.floor(product.sizes.length / 2)] ?? "M",
          note:
            product.category === "pants"
              ? "Drift Pants are waist sizes 28–38. Use your usual waist."
              : "Ridge Approach Shoes follow your usual US street size. Whole sizes only.",
        },
      ],
    };
  }
  const rec = recommendApparelSize({
    heightIn: input.heightIn,
    usualSize: input.usualSize,
    layering: input.layering,
  });
  return {
    ok: true,
    summary: `Recommended ${rec.size} in ${product.name}`,
    cards: [
      { type: "size", productName: product.name, size: rec.size, note: rec.note },
      { type: "products", products: [product] },
    ],
  };
}

export function toolSearchKnowledge(query: string): ToolOutcome {
  const hits = retrieve(query, 3);
  return {
    ok: true,
    summary: hits.length ? `Retrieved ${hits[0].chunk.title}` : "No note retrieved",
    cards: [],
    data: { hits: hits.map((hit) => ({ ...hit.chunk, score: hit.score })) },
  };
}

export function recordTicket(
  store: Store,
  input: {
    conversationId: string;
    priority: TicketPriority;
    reason: string;
    summary: string;
  },
): Card {
  const id = nextNumber(store, "ticket", "TCK-", 1101);
  const now = new Date().toISOString();
  store.run(
    `INSERT INTO tickets (id, conversation_id, priority, reason, summary, status, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.conversationId, input.priority, input.reason, input.summary, "open", null, now, now],
  );
  store.run("UPDATE conversations SET status = ?, summary = ? WHERE id = ?", [
    "handed_off",
    input.summary,
    input.conversationId,
  ]);
  const handoffDetail = maskPii(`${id} ${input.reason}`);
  store.run("INSERT INTO audit (at, action, detail) VALUES (?, ?, ?)", [now, "handoff", handoffDetail]);
  logSafe("handoff", handoffDetail);
  return {
    type: "ticket",
    id,
    priority: input.priority,
    reason: input.reason,
    summary: input.summary,
    status: "open",
  };
}
