import type { Store } from "@/lib/db";
import { answerQuestion } from "@/lib/answers";
import { findVerifiedOrder } from "@/lib/orders";
import { matchItems } from "@/lib/match";
import {
  emailSchema,
  goodwillSchema,
  handoffSchema,
  knowledgeSchema,
  lookupSchema,
  orderNumberSchema,
  productSchema,
  returnSchema,
  sizeSchema,
  type ToolName,
} from "@/lib/tool-schemas";
import {
  toolCancel,
  toolGoodwill,
  toolProducts,
  toolRefundStatus,
  toolSize,
  toolStartReturn,
  toolTrack,
  type ToolOutcome,
} from "@/lib/tools";
import type { ReturnReason } from "@/lib/types";

export type DispatchResult = {
  outcome: ToolOutcome;
  handoff?: { reason: string; priority: "normal" | "high" | "urgent" };
};

function fail(message: string): ToolOutcome {
  return { ok: false, summary: "Rejected tool arguments", message };
}

export function dispatchTool(
  store: Store,
  name: string,
  raw: unknown,
  ctx: { conversationId: string | null },
): DispatchResult {
  const args = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (name === "search_knowledge") {
    const parsed = knowledgeSchema.safeParse(args);
    if (!parsed.success) return { outcome: fail(parsed.error.issues[0]?.message ?? "Bad query") };
    const answer = answerQuestion(parsed.data.query);
    if (!answer.grounded) {
      return {
        outcome: {
          ok: false,
          summary: "No grounded note",
          message: answer.text,
        },
      };
    }
    return {
      outcome: {
        ok: true,
        summary: `Retrieved ${answer.citations[0]?.title ?? "a note"}`,
        cards: [],
        data: { text: answer.text, citations: answer.citations },
      },
    };
  }
  if (name === "product_search") {
    const parsed = productSchema.safeParse(args);
    if (!parsed.success) return { outcome: fail("Bad catalog query") };
    return { outcome: toolProducts(parsed.data.query) };
  }
  if (name === "size_recommendation") {
    const parsed = sizeSchema.safeParse(args);
    if (!parsed.success) return { outcome: fail("Bad size request") };
    return {
      outcome: toolSize({
        query: parsed.data.query,
        heightIn: parsed.data.heightIn,
        usualSize: parsed.data.usualSize,
        layering: parsed.data.layering ?? false,
      }),
    };
  }
  if (name === "handoff_to_agent") {
    const parsed = handoffSchema.safeParse(args);
    if (!parsed.success) return { outcome: fail("Bad handoff") };
    if (!ctx.conversationId) return { outcome: fail("No conversation") };
    return {
      outcome: { ok: true, summary: "Handoff requested", cards: [] },
      handoff: { reason: parsed.data.reason, priority: parsed.data.priority ?? "normal" },
    };
  }

  const orderNumber = orderNumberSchema.safeParse(String(args.orderNumber ?? "").toUpperCase());
  const email = emailSchema.safeParse(String(args.email ?? ""));
  if (!orderNumber.success || !email.success) {
    return { outcome: fail("Order tools need a DW- order number and a checkout email.") };
  }
  const base = { orderNumber: orderNumber.data.toUpperCase(), email: email.data };

  if (name === "lookup_order" || name === "track_shipment") {
    const parsed = lookupSchema.safeParse(base);
    if (!parsed.success) return { outcome: fail("Order tools need a DW- order number and a checkout email.") };
    return { outcome: toolTrack(store, parsed.data.orderNumber.toUpperCase(), parsed.data.email) };
  }
  if (name === "check_refund_status") {
    return { outcome: toolRefundStatus(store, base.orderNumber, base.email) };
  }
  if (name === "cancel_order") {
    return { outcome: toolCancel(store, base.orderNumber, base.email) };
  }
  if (name === "apply_goodwill_coupon") {
    const parsed = goodwillSchema.safeParse({ ...base, note: String(args.note ?? "") });
    if (!parsed.success) return { outcome: fail("Courtesy requests need a short note.") };
    return {
      outcome: toolGoodwill(store, {
        orderNumber: parsed.data.orderNumber.toUpperCase(),
        email: parsed.data.email,
        note: parsed.data.note,
        conversationId: ctx.conversationId,
      }),
    };
  }
  if (name === "start_return" || name === "start_exchange") {
    const order = findVerifiedOrder(store, base.orderNumber, base.email);
    if (!order) return { outcome: toolTrack(store, base.orderNumber, base.email) };
    const named = Array.isArray(args.itemIds) ? args.itemIds.map(String) : [];
    const fromNames = matchItems(order.items, named.join(" ") || String(args.itemNames ?? ""));
    const itemIds = fromNames.length ? fromNames.map((item) => item.id) : named;
    const parsed = returnSchema.safeParse({
      ...base,
      itemIds,
      reason: args.reason ?? "changed_mind",
      kind: name === "start_exchange" ? "exchange" : "return",
      replacementSize: args.replacementSize ? String(args.replacementSize) : undefined,
    });
    if (!parsed.success) return { outcome: fail(parsed.error.issues[0]?.message ?? "Bad return") };
    return {
      outcome: toolStartReturn(store, {
        orderNumber: parsed.data.orderNumber.toUpperCase(),
        email: parsed.data.email,
        itemIds: parsed.data.itemIds,
        reason: parsed.data.reason as ReturnReason,
        conversationId: ctx.conversationId,
        kind: parsed.data.kind,
        replacementSize: parsed.data.replacementSize,
      }),
    };
  }
  return { outcome: fail(`Unknown tool ${name}`) };
}

export function isToolName(name: string): name is ToolName {
  return [
    "search_knowledge",
    "lookup_order",
    "track_shipment",
    "start_return",
    "start_exchange",
    "check_refund_status",
    "product_search",
    "size_recommendation",
    "apply_goodwill_coupon",
    "cancel_order",
    "handoff_to_agent",
  ].includes(name);
}
