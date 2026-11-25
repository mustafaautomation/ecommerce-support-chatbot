import {
  GOODWILL_CAP_CENTS,
  GOODWILL_PERCENT,
  HIGH_VALUE_ITEM_CENTS,
  HIGH_VALUE_ORDER_CENTS,
  LABEL_FEE_CENTS,
  LATE_GRACE_DAYS,
  RETURN_WINDOW_DAYS,
} from "@/lib/constants";
import type { Order, OrderItem, ReturnReason } from "@/lib/types";

const MS_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(earlierIso: string, later: Date): number {
  return (later.getTime() - new Date(earlierIso).getTime()) / MS_DAY;
}

export function isFinalSaleBlocked(item: OrderItem, reason: ReturnReason): boolean {
  return item.finalSale && reason !== "damaged" && reason !== "defective" && reason !== "wrong_item";
}

export function returnBlocker(
  order: Order,
  item: OrderItem,
  reason: ReturnReason,
  now = new Date(),
): string | null {
  if (order.status === "cancelled") return `${order.number} is cancelled, so there is nothing to send back.`;
  if (item.returnedRma) return `${item.name} is already on return ${item.returnedRma}.`;
  if (order.status !== "delivered" || !order.deliveredAt) {
    return `${order.number} has not been delivered yet. A return opens after the carrier marks it delivered.`;
  }
  const age = daysBetween(order.deliveredAt, now);
  if (age > RETURN_WINDOW_DAYS) {
    return `${item.name} was delivered ${Math.floor(age)} days ago, past the ${RETURN_WINDOW_DAYS}-day window.`;
  }
  if (isFinalSaleBlocked(item, reason)) {
    return `${item.name} is final sale, so it can’t come back for fit or a change of mind. Damage and defects are the exception.`;
  }
  if (reason === "missing") {
    return "A missing parcel stays with a person on the desk. There is nothing to put on a return label.";
  }
  return null;
}

export function labelFeeCents(reason: ReturnReason): number {
  if (reason === "damaged" || reason === "defective" || reason === "wrong_item") return 0;
  return LABEL_FEE_CENTS;
}

export function isHighValueClaim(order: Order, items: OrderItem[]): boolean {
  if (order.totalCents >= HIGH_VALUE_ORDER_CENTS) return true;
  return items.some((item) => item.priceCents >= HIGH_VALUE_ITEM_CENTS);
}

export function isLate(order: Order, now = new Date()): boolean {
  if (!order.promisedAt) return false;
  const arrived = order.deliveredAt ? new Date(order.deliveredAt) : now;
  const lateDays = (arrived.getTime() - new Date(order.promisedAt).getTime()) / MS_DAY;
  if (order.deliveredAt) return lateDays > LATE_GRACE_DAYS;
  return new Date(order.promisedAt).getTime() < now.getTime() - LATE_GRACE_DAYS * MS_DAY;
}

export type GoodwillDecision =
  | {
      ok: true;
      percent: number;
      capCents: number;
      reason: string;
    }
  | { ok: false; handoff: boolean; message: string };

export function goodwillDecision(
  order: Order,
  requestNote: string,
  alreadyIssued: boolean,
  now = new Date(),
): GoodwillDecision {
  const note = requestNote.toLowerCase();
  const asksOverCap = /\b(50%|40%|30%|25%|half off|cash|full refund)\b/.test(note);
  if (alreadyIssued) {
    return {
      ok: false,
      handoff: false,
      message: `Order ${order.number} already has a courtesy code. We issue one per order.`,
    };
  }
  if (order.totalCents > HIGH_VALUE_ORDER_CENTS) {
    return {
      ok: false,
      handoff: true,
      message: `Order ${order.number} is over $400, so a courtesy code has to come from a person.`,
    };
  }
  if (asksOverCap) {
    return {
      ok: false,
      handoff: false,
      message: `Courtesy codes are ${GOODWILL_PERCENT}% off a future order, capped at $25. I can’t issue more than that.`,
    };
  }
  if (!isLate(order, now)) {
    return {
      ok: false,
      handoff: false,
      message:
        "A courtesy code is only for a delivery we missed by more than 2 days. This order isn’t in that group, so I can’t add a discount.",
    };
  }
  return {
    ok: true,
    percent: GOODWILL_PERCENT,
    capCents: GOODWILL_CAP_CENTS,
    reason: `Delivery promise missed by more than ${LATE_GRACE_DAYS} days.`,
  };
}

export function canCancel(order: Order): string | null {
  if (order.status === "cancelled") return `${order.number} is already cancelled.`;
  if (order.status === "processing") return null;
  return `${order.number} is ${order.status.replaceAll("_", " ")}. A label already exists, so I can’t cancel it. After delivery you can start a return on eligible items.`;
}

const SIZE_CHART: { size: string; minHeight: number; maxHeight: number }[] = [
  { size: "XS", minHeight: 62, maxHeight: 65 },
  { size: "S", minHeight: 64, maxHeight: 68 },
  { size: "M", minHeight: 68, maxHeight: 71 },
  { size: "L", minHeight: 71, maxHeight: 74 },
  { size: "XL", minHeight: 73, maxHeight: 78 },
];

export function recommendApparelSize(input: {
  heightIn?: number;
  usualSize?: string;
  layering: boolean;
}): { size: string; note: string } {
  if (input.heightIn) {
    const matches = SIZE_CHART.filter(
      (row) => input.heightIn! >= row.minHeight && input.heightIn! <= row.maxHeight,
    );
    const pick =
      matches[0] ??
      (input.heightIn < SIZE_CHART[0].minHeight
        ? SIZE_CHART[0]
        : SIZE_CHART[SIZE_CHART.length - 1]);
    let size = pick.size;
    let note = `${size} matches a height of ${input.heightIn} inches on the shell, fleece, and parka chart.`;
    const index = SIZE_CHART.findIndex((row) => row.size === size);
    if (input.layering && index < SIZE_CHART.length - 1) {
      size = SIZE_CHART[index + 1].size;
      note = `${pick.size} matches the height, and I sized up to ${size} so a fleece layer fits underneath.`;
    }
    return { size, note };
  }
  if (input.usualSize) {
    return {
      size: input.usualSize,
      note: `Without a height, I’d stay with your usual ${input.usualSize}. Size up if you plan to layer.`,
    };
  }
  return {
    size: "M",
    note: "I need a height or your usual size before I lock a recommendation. Medium is the most common shell size.",
  };
}
