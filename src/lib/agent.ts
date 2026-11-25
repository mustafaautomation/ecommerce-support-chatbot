import { answerQuestion } from "@/lib/answers";
import { money, prettyDate, prettyDateTime, clip } from "@/lib/format";
import { getStore, type Store } from "@/lib/db";
import { randomId } from "@/lib/ids";
import {
  extractEmails,
  extractOrders,
  interpret,
  replacementSize,
  type HistoryTurn,
  type Intent,
  type VerifiedOrder,
} from "@/lib/interpret";
import { detectReason, matchItems } from "@/lib/match";
import { findVerifiedOrder } from "@/lib/orders";
import { isHighValueClaim } from "@/lib/policy";
import {
  recordTicket,
  toolCancel,
  toolGoodwill,
  toolProducts,
  toolRefundStatus,
  toolSize,
  toolStartReturn,
  toolTrack,
  type ToolOutcome,
} from "@/lib/tools";
import type { Card, Citation, Order, TicketPriority, ToolTrace, TurnResult } from "@/lib/types";

type ConversationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  customer_email: string | null;
  status: string;
  verified_json: string;
  fail_streak: number;
  summary: string | null;
};

function loadHistory(store: Store, conversationId: string): HistoryTurn[] {
  return store
    .all<{ role: "user" | "assistant"; content: string }>(
      "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [conversationId],
    )
    .filter((row) => row.role === "user" || row.role === "assistant");
}

function remember(verified: VerifiedOrder[], orderNumber: string, email: string): VerifiedOrder[] {
  const next = verified.filter((row) => row.orderNumber !== orderNumber);
  next.push({ orderNumber, email: email.toLowerCase() });
  return next;
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case "chargeback":
      return "The shopper mentioned a chargeback, a bank dispute, or legal action.";
    case "damaged_high_value":
      return "A high-value item was reported damaged. Do not refund until someone reviews it.";
    case "missing_high_value":
      return "A high-value parcel was reported missing.";
    case "missing_parcel":
      return "The shopper says the parcel did not arrive. Confirm the scan before any refund.";
    case "repeated_failure":
      return "Lookup failed more than once, or the shopper said the assistant was not helping.";
    case "human_requested":
      return "The shopper asked for a person.";
    case "low_confidence":
      return "Retrieval confidence was too low to answer from the shop notes.";
    case "goodwill_over_limit":
      return "The courtesy request is outside the automatic 10% / $25 cap.";
    default:
      return reason;
  }
}

function ticketSummary(input: {
  message: string;
  email?: string;
  order?: Order;
  reason: string;
}): string {
  const orderLine = input.order
    ? `Order ${input.order.number} is ${input.order.status.replaceAll("_", " ")} for ${input.order.customerName} in ${input.order.city}, total ${money(input.order.totalCents)}, paid with ${input.order.paymentMethod}.`
    : "No order was verified in this chat.";
  return [
    `Shopper email: ${input.email ?? "not verified"}.`,
    orderLine,
    `They said: “${clip(input.message, 280)}”`,
    reasonLabel(input.reason),
    "Next step: a person replies on this ticket. Chat will not issue a label, a coupon, or a cancellation after this handoff.",
  ].join(" ");
}

function itemLine(order: Order): string {
  return order.items
    .map((item) => {
      if (item.returnedRma) return `${item.name} is already on ${item.returnedRma}`;
      if (item.finalSale) return `${item.name} is final sale`;
      if (order.status === "delivered" && order.deliveredAt) {
        return `${item.name} can still be returned if you’re inside 30 days of ${prettyDate(order.deliveredAt)}`;
      }
      return item.name;
    })
    .join(". ");
}

function composeTrack(order: Order, outcome: ToolOutcome): string {
  if (!outcome.ok) return outcome.message;
  const tracking = outcome.cards.find((card) => card.type === "tracking");
  if (!tracking || tracking.type !== "tracking") {
    return `${order.number} for ${order.customerName} is still processing in Grayhaven. There’s no carrier scan yet, so it can still be cancelled. It was placed ${prettyDate(order.placedAt)} on ${order.shippingMethod}, heading to ${order.city}, ${order.region}.`;
  }
  const last = tracking.events[tracking.events.length - 1];
  const lead =
    order.status === "delivered" && order.deliveredAt
      ? `${order.number} was delivered ${prettyDate(order.deliveredAt)} in ${order.city}, ${order.region}. ${tracking.carrier} ${tracking.trackingNumber} shows “${last.label}” — ${last.detail}`
      : `${order.number} is ${order.status.replaceAll("_", " ")}. ${tracking.carrier} ${tracking.trackingNumber} last checked in as “${last.label}” in ${last.location} on ${prettyDateTime(last.at)}. ${last.detail}`;
  return `${lead} ${itemLine(order)}.`;
}

function suggestionsFor(order: Order | undefined, intent: Intent["type"]): string[] {
  if (!order) {
    if (intent === "knowledge") return ["Where is my order #DW-10482?", "What’s your return policy?"];
    return [];
  }
  if (intent === "track" && order.status === "delivered") {
    const beanie = order.items.find((item) => /beanie/i.test(item.name) && !item.returnedRma);
    const ideas = [];
    if (beanie) ideas.push("Return the Trail Wool Beanie — it doesn't fit");
    ideas.push("When will a refund show up?");
    return ideas;
  }
  if (intent === "return" || intent === "exchange") return ["When will a refund show up?", "Talk to a person"];
  return [];
}

export function runTurn(conversationId: string | null, rawMessage: string, store = getStore()): TurnResult {
  const message = rawMessage.trim();
  const now = new Date().toISOString();
  let id = conversationId;
  if (!id) {
    id = randomId("c");
    store.run(
      `INSERT INTO conversations (id, created_at, updated_at, customer_email, status, verified_json, fail_streak, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, now, now, null, "open", "[]", 0, null],
    );
  }
  const conversation = store.get<ConversationRow>("SELECT * FROM conversations WHERE id = ?", [id]);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const userMessageId = randomId("m");
  store.run(
    `INSERT INTO messages (id, conversation_id, role, content, cards_json, citations_json, tools_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userMessageId, id, "user", message, "[]", "[]", "[]", now],
  );

  const openTicket = store.get<{ id: string }>(
    "SELECT id FROM tickets WHERE conversation_id = ? AND status != 'resolved' ORDER BY created_at DESC LIMIT 1",
    [id],
  );
  if (conversation.status === "handed_off" && openTicket) {
    const text = `This chat is already with the desk on ${openTicket.id}. I won’t start another return, coupon, or cancellation from here. A person has the summary and will reply on the ticket.`;
    return finish(store, {
      conversationId: id,
      text,
      cards: [],
      citations: [],
      tools: [],
      suggestions: [],
      handoff: true,
      verified: JSON.parse(conversation.verified_json) as VerifiedOrder[],
      failStreak: conversation.fail_streak,
      email: conversation.customer_email,
    });
  }

  const history = loadHistory(store, id).slice(0, -1);
  const verified = JSON.parse(conversation.verified_json) as VerifiedOrder[];
  const intent = interpret({
    message,
    history,
    verified,
    failStreak: conversation.fail_streak,
  });

  const cards: Card[] = [];
  const citations: Citation[] = [];
  const tools: ToolTrace[] = [];
  let text = "";
  let suggestions: string[] = [];
  let handoff = false;
  let nextVerified = verified;
  let failStreak = conversation.fail_streak;
  let email = conversation.customer_email;

  const noteEmail = (value?: string) => {
    if (value) email = value.toLowerCase();
  };

  const applyOutcome = (name: string, outcome: ToolOutcome) => {
    tools.push({ name, ok: outcome.ok, summary: outcome.summary });
    if (outcome.ok) {
      cards.push(...outcome.cards);
      failStreak = 0;
      return;
    }
    if (outcome.summary.startsWith("No match")) failStreak += 1;
    if (outcome.cards) cards.push(...outcome.cards);
  };

  const handoffNow = (reason: string, priority: TicketPriority, order?: Order, knownEmail?: string) => {
    const summary = ticketSummary({ message, email: knownEmail ?? email ?? undefined, order, reason });
    const card = recordTicket(store, {
      conversationId: id!,
      priority,
      reason,
      summary,
    });
    cards.push(card);
    tools.push({ name: "handoff_to_agent", ok: true, summary: `Opened ${card.type === "ticket" ? card.id : "ticket"}` });
    text = `I’m handing this to a person. ${card.type === "ticket" ? card.id : "A ticket"} is open with the desk at ${priority} priority. I won’t issue a label, a coupon, or a cancellation on this chat now.`;
    handoff = true;
    suggestions = [];
  };

  if (intent.type === "greeting") {
    text =
      "Hi, I’m Rowan. I can track a Driftwood order, start a return or exchange, or look up shipping, sizing, and care from the shop notes. What do you need?";
    suggestions = ["Where is my order #DW-10482?", "What’s your return policy?", "What size rain shell should I get?"];
  } else if (intent.type === "thanks") {
    text = "You’re welcome. I’ll be here if the parcel or the size chart needs another look.";
  } else if (intent.type === "need_order") {
    text =
      "I can do that once I have the order number. It’s on the receipt as DW- followed by digits, and I’ll also need the email used at checkout.";
  } else if (intent.type === "need_email") {
    text = `I can look up ${intent.orderNumber} after you confirm the email used at checkout. I won’t open the order without it.`;
  } else if (intent.type === "knowledge") {
    const answer = answerQuestion(intent.query);
    tools.push({
      name: "search_knowledge",
      ok: answer.grounded,
      summary: answer.grounded ? `Retrieved ${answer.citations[0]?.title ?? "a note"}` : "No grounded note",
    });
    if (!answer.grounded) {
      handoffNow("low_confidence", "normal");
      text = `I don’t have a Driftwood note that answers that. ${text}`;
    } else {
      text = answer.text;
      citations.push(...answer.citations);
      suggestions = suggestionsFor(undefined, "knowledge");
    }
  } else if (intent.type === "product") {
    const outcome = toolProducts(intent.query);
    applyOutcome("product_search", outcome);
    text = outcome.ok
      ? `Here’s what matches in the current catalog. Prices are the shelf price before any code.`
      : outcome.message;
  } else if (intent.type === "size") {
    const outcome = toolSize({
      query: intent.text,
      heightIn: intent.heightIn,
      usualSize: intent.usualSize,
      layering: intent.layering,
    });
    applyOutcome("size_recommendation", outcome);
    const sizing = answerQuestion("shell sizing chart height chest");
    citations.push(...sizing.citations);
    const sizeCard = outcome.ok ? outcome.cards.find((card) => card.type === "size") : undefined;
    text =
      sizeCard && sizeCard.type === "size"
        ? `${sizeCard.note} That’s for the ${sizeCard.productName}.`
        : outcome.ok
          ? outcome.summary
          : outcome.message;
  } else if (intent.type === "handoff") {
    noteEmail(extractEmails(intent.detail)[0]);
    const orderNumber = extractOrders(intent.detail)[0];
    const order =
      orderNumber && email ? findVerifiedOrder(store, orderNumber, email) : undefined;
    if (order && email) nextVerified = remember(nextVerified, order.number, email);
    handoffNow(intent.reason, intent.priority, order, email ?? undefined);
  } else {
    noteEmail(intent.email);
    const order = findVerifiedOrder(store, intent.orderNumber, intent.email);
    if (intent.type === "track") {
      const outcome = toolTrack(store, intent.orderNumber, intent.email);
      applyOutcome("track_shipment", outcome);
      if (outcome.ok && order) nextVerified = remember(nextVerified, order.number, order.email);
      text = order && outcome.ok ? composeTrack(order, outcome) : outcome.ok ? outcome.summary : outcome.message;
      if (outcome.ok) {
        const shipping = answerQuestion("how long does shipping take and can I cancel");
        if (order?.status === "processing") citations.push(...shipping.citations);
      }
      suggestions = suggestionsFor(order, "track");
    } else if (intent.type === "cancel") {
      const outcome = toolCancel(store, intent.orderNumber, intent.email);
      applyOutcome("cancel_order", outcome);
      if (outcome.ok && order) nextVerified = remember(nextVerified, intent.orderNumber, intent.email);
      text = outcome.ok
        ? `${intent.orderNumber} is cancelled. It was still processing, so no label had been created and you won’t be charged a ship fee. The payment release goes back to the original method.`
        : outcome.message;
      if (!outcome.ok) citations.push(...answerQuestion("can I cancel an order after the label").citations);
    } else if (intent.type === "refund") {
      const outcome = toolRefundStatus(store, intent.orderNumber, intent.email);
      applyOutcome("check_refund_status", outcome);
      const policy = answerQuestion("how long do refunds take");
      citations.push(...policy.citations);
      if (!outcome.ok) text = outcome.message;
      else if (order) {
        nextVerified = remember(nextVerified, order.number, order.email);
        const rows = (outcome.data?.returns ?? []) as {
          rma: string;
          status: string;
          refund_cents: number | null;
          refund_issued_at: string | null;
        }[];
        if (rows.length === 0) {
          text = `There’s no return on ${order.number} yet, so no refund is in motion. ${policy.text}`;
        } else {
          const latest = rows[0];
          const amount = latest.refund_cents != null ? money(latest.refund_cents) : "the refund";
          const when = latest.refund_issued_at
            ? ` We issued it ${prettyDate(latest.refund_issued_at)} back to ${order.paymentMethod}.`
            : "";
          text = `${latest.rma} is ${latest.status.replaceAll("_", " ")}. ${amount} is the amount on the return.${when} ${policy.text}`;
        }
      }
    } else if (intent.type === "goodwill") {
      const outcome = toolGoodwill(store, {
        orderNumber: intent.orderNumber,
        email: intent.email,
        note: intent.text,
        conversationId: id,
      });
      applyOutcome("apply_goodwill_coupon", outcome);
      const promo = answerQuestion("courtesy coupon policy WELCOME10");
      citations.push(...promo.citations);
      if (outcome.ok) {
        const coupon = outcome.cards.find((card) => card.type === "coupon");
        text =
          coupon && coupon.type === "coupon"
            ? `I issued ${coupon.code} on ${coupon.orderNumber}: ${coupon.percent}% off a future order, capped at ${money(coupon.capCents)}. It doesn’t stack, and it skips final sale. One code per order — this one is logged.`
            : outcome.summary;
        if (order) nextVerified = remember(nextVerified, order.number, order.email);
      } else if (outcome.handoff) {
        handoffNow(outcome.handoff.reason, outcome.handoff.priority, order, intent.email);
      } else {
        text = outcome.message;
      }
    } else if (intent.type === "return" || intent.type === "exchange") {
      if (!order) {
        const outcome = toolTrack(store, intent.orderNumber, intent.email);
        applyOutcome("lookup_order", outcome);
        text = outcome.ok ? outcome.summary : outcome.message;
      } else {
        nextVerified = remember(nextVerified, order.number, order.email);
        const reason = detectReason(intent.text);
        const matched = matchItems(order.items, intent.text);
        const chosen = matched.length > 0 ? matched : [];
        if (reason === "missing") {
          const high = isHighValueClaim(order, chosen.length ? chosen : order.items);
          handoffNow(high ? "missing_high_value" : "missing_parcel", high ? "high" : "normal", order, intent.email);
        } else if (chosen.length === 0) {
          const names = order.items
            .map((item) => `${item.name}${item.finalSale ? " (final sale)" : ""}${item.returnedRma ? ` (already ${item.returnedRma})` : ""}`)
            .join(", ");
          text = `Which item should I include? On ${order.number}: ${names}.`;
          cards.push({ type: "order", order });
          tools.push({ name: "lookup_order", ok: true, summary: `Looked up ${order.number}` });
        } else if (intent.type === "exchange" && !/\bsize\b|\b(small|medium|large|xs|xl)\b/i.test(intent.text)) {
          text = `I can exchange ${chosen.map((item) => item.name).join(" and ")}. What size should I send when the return is scanned?`;
          cards.push({ type: "order", order });
        } else {
          const size = intent.type === "exchange" ? replacementSize(intent.text) : undefined;
          const outcome = toolStartReturn(store, {
            orderNumber: order.number,
            email: order.email,
            itemIds: chosen.map((item) => item.id),
            reason,
            conversationId: id,
            kind: intent.type === "exchange" ? "exchange" : "return",
            replacementSize: size,
          });
          applyOutcome(intent.type === "exchange" ? "start_exchange" : "start_return", outcome);
          const returns = answerQuestion("return policy 30 day final sale label fee");
          citations.push(...returns.citations);
          if (outcome.ok) {
            const label = outcome.cards.find((card) => card.type === "return_label");
            if (label && label.type === "return_label") {
              const names = label.items.map((item) => `${item.name}${item.size !== "OS" ? ` (${item.size})` : ""}`).join(", ");
              const fee =
                label.labelFeeCents > 0
                  ? `The prepaid label fee is ${money(label.labelFeeCents)}, taken out of the refund.`
                  : "There’s no label fee on this one.";
              const exchange =
                label.kind === "exchange"
                  ? ` The ${label.replacementSize ?? "replacement"} size ships when Northline scans the return.`
                  : "";
              text = `${label.kind === "exchange" ? "Exchange" : "Return"} started for ${names}. Your RMA is ${label.rma}. The label is ready.${exchange} ${fee} Estimated refund ${money(label.refundEstimateCents)} to ${order.paymentMethod}. We issue refunds within 2 business days of the warehouse scan, then cards take 5–7 business days.`;
            } else text = outcome.summary;
          } else if (outcome.handoff) {
            text = outcome.message;
            handoffNow(outcome.handoff.reason, outcome.handoff.priority, order, intent.email);
          } else {
            text = outcome.message;
          }
        }
      }
    }
  }

  if (!handoff && failStreak >= 2) {
    handoffNow("repeated_failure", "normal");
    failStreak = 0;
  }

  return finish(store, {
    conversationId: id,
    text,
    cards: dedupeCards(cards),
    citations: dedupeCitations(citations),
    tools,
    suggestions,
    handoff,
    verified: nextVerified,
    failStreak,
    email,
  });
}

function dedupeCards(cards: Card[]): Card[] {
  const seen = new Set<string>();
  const next: Card[] = [];
  for (const card of cards) {
    const key =
      card.type === "order"
        ? `order:${card.order.number}:${card.order.status}`
        : card.type === "tracking"
          ? `tracking:${card.trackingNumber}`
          : card.type === "return_label"
            ? `rma:${card.rma}`
            : card.type === "ticket"
              ? `ticket:${card.id}`
              : card.type === "coupon"
                ? `coupon:${card.code}`
                : card.type === "size"
                  ? `size:${card.productName}`
                  : `products:${card.products.map((product) => product.sku).join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(card);
  }
  return next;
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.slug}:${citation.section}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function finish(
  store: Store,
  input: {
    conversationId: string;
    text: string;
    cards: Card[];
    citations: Citation[];
    tools: ToolTrace[];
    suggestions: string[];
    handoff: boolean;
    verified: VerifiedOrder[];
    failStreak: number;
    email: string | null;
  },
): TurnResult {
  const messageId = randomId("m");
  const now = new Date().toISOString();
  const text = input.text || "I didn’t catch that. You can ask about an order, a return, or a shop policy.";
  store.run(
    `INSERT INTO messages (id, conversation_id, role, content, cards_json, citations_json, tools_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      messageId,
      input.conversationId,
      "assistant",
      text,
      JSON.stringify(input.cards),
      JSON.stringify(input.citations),
      JSON.stringify(input.tools),
      now,
    ],
  );
  store.run(
    `UPDATE conversations SET updated_at = ?, customer_email = ?, verified_json = ?, fail_streak = ? WHERE id = ?`,
    [now, input.email, JSON.stringify(input.verified), input.failStreak, input.conversationId],
  );
  return {
    conversationId: input.conversationId,
    messageId,
    text,
    cards: input.cards,
    citations: input.citations,
    tools: input.tools,
    suggestions: input.suggestions,
    handoff: input.handoff,
  };
}
