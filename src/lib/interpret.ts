import type { TicketPriority } from "@/lib/types";

export type HistoryTurn = { role: "user" | "assistant"; content: string };
export type VerifiedOrder = { orderNumber: string; email: string };

export type Intent =
  | { type: "greeting" }
  | { type: "thanks" }
  | {
      type: "handoff";
      reason: string;
      priority: TicketPriority;
      detail: string;
    }
  | { type: "need_order"; action: string }
  | { type: "need_email"; orderNumber: string; action: string }
  | { type: "track"; orderNumber: string; email: string }
  | { type: "return"; orderNumber: string; email: string; text: string }
  | { type: "exchange"; orderNumber: string; email: string; text: string }
  | { type: "cancel"; orderNumber: string; email: string }
  | { type: "refund"; orderNumber: string; email: string }
  | { type: "goodwill"; orderNumber: string; email: string; text: string }
  | {
      type: "size";
      text: string;
      heightIn?: number;
      usualSize?: string;
      layering: boolean;
    }
  | { type: "product"; query: string }
  | { type: "knowledge"; query: string };

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function normalizeOrder(raw: string): string {
  const match = raw.toUpperCase().replace(/\s+/g, "").match(/DW-?(\d{4,6})/);
  return match ? `DW-${match[1]}` : raw.toUpperCase();
}

export function extractEmails(text: string): string[] {
  return [...text.matchAll(EMAIL_RE)].map((match) => match[0].toLowerCase());
}

export function extractOrders(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/\bDW-?\s?\d{4,6}\b/gi)) {
    const order = normalizeOrder(match[0]);
    if (!found.includes(order)) found.push(order);
  }
  return found;
}

export function parseHeightInches(text: string): number | undefined {
  const feet = text.match(/(\d)\s*'\s*(\d{1,2})/);
  if (feet) return Number(feet[1]) * 12 + Number(feet[2]);
  const cm = text.match(/(\d{3})\s*cm\b/i);
  if (cm) return Math.round(Number(cm[1]) / 2.54);
  return undefined;
}

export function parseUsualSize(text: string): string | undefined {
  const lower = text.toLowerCase();
  const words: [RegExp, string][] = [
    [/\bextra small\b|\bxxs\b/, "XS"],
    [/\bsmall\b/, "S"],
    [/\bmedium\b/, "M"],
    [/\bextra large\b|\bxxl\b/, "XXL"],
    [/\blarge\b/, "L"],
    [/\bxl\b/, "XL"],
    [/\bsize\s+(xs|s|m|l|xl)\b/, ""],
  ];
  for (const [pattern, size] of words) {
    const match = lower.match(pattern);
    if (!match) continue;
    if (size) return size;
    return match[1].toUpperCase();
  }
  const waist = lower.match(/\b(2[8]|3[0-8])\b/);
  if (waist && /pant|waist/.test(lower)) return waist[1];
  return undefined;
}

export function replacementSize(text: string): string | undefined {
  const explicit = text.match(/\bsize\s+(xxs|xs|s|m|l|xl|xxl|\d{1,2})\b/i);
  if (explicit) {
    const token = explicit[1].toUpperCase();
    if (token === "S" || token === "M" || token === "L") return token;
    return token;
  }
  return parseUsualSize(text);
}

function isEmailOnly(text: string): boolean {
  if (extractEmails(text).length === 0) return false;
  const stripped = text
    .replace(EMAIL_RE, "")
    .replace(/\b(my|email|e-mail|is|it's|its|the|address|checkout|here|you|go|order)\b/gi, "")
    .replace(/[^a-z0-9]+/gi, "");
  return stripped.length === 0;
}

function lastUserText(history: HistoryTurn[]): string {
  return [...history].reverse().find((turn) => turn.role === "user")?.content ?? "";
}

type Action =
  | "track"
  | "return"
  | "exchange"
  | "cancel"
  | "refund"
  | "goodwill"
  | "size"
  | "product"
  | "knowledge";

function classify(text: string, hasOrder: boolean): Action {
  const t = text.toLowerCase();
  if (/\b(exchange|swap)\b/.test(t) && !/\bexchange policy\b/.test(t)) return "exchange";
  if (
    /\b(return|send (it|them|this) back)\b/.test(t) &&
    !/\b(return policy|how do returns|return window|returns work)\b/.test(t)
  ) {
    return "return";
  }
  if (hasOrder && /\b(damaged|damage|defective|defect|missing|never arrived|hole|torn|ripped)\b/.test(t)) {
    return "return";
  }
  if (/\bcancel/.test(t) && (hasOrder || /\bmy order\b/.test(t))) return "cancel";
  if (/\bcancel/.test(t)) return "knowledge";
  if (
    /\b(courtesy|goodwill|make it right|compensation)\b/.test(t) ||
    (/\b(coupon|discount)\b/.test(t) && /\b(late|delay|wait|trouble|sorry)\b/.test(t)) ||
    (/\b(give|offer|get) me\b/.test(t) && /\b(coupon|discount|%|percent)\b/.test(t))
  ) {
    if (!( /\bwelcome10\b/.test(t) && !/\b(late|delay|courtesy)\b/.test(t) && !hasOrder)) {
      return "goodwill";
    }
  }
  if (
    /\b(refund status|status of (my|the) refund|has my refund|when will i (get|see)|money back)\b/.test(
      t,
    ) ||
    (/\brefund\b/.test(t) && hasOrder && !/\b(how long|policy|when are refunds)\b/.test(t))
  ) {
    return "refund";
  }
  if (
    /\b(what size|which size|size should|recommend a size)\b/.test(t) ||
    (/\d\s*'\s*\d{1,2}/.test(t) && /\b(size|fit|shell|fleece|jacket|parka|pant|shoe)\b/.test(t))
  ) {
    return "size";
  }
  if (
    /\b(show me|looking for|do you (sell|carry|have)|recommend)\b/.test(t) &&
    /\b(jacket|shell|fleece|pant|beanie|shoe|vest|parka|tote|sock|swim|coat)\b/.test(t)
  ) {
    return "product";
  }
  if (
    /\b(where is|where's|where’s|track|tracking|parcel|shipment|has it shipped)\b/.test(t) ||
    (/\bstatus\b/.test(t) && /\border\b/.test(t)) ||
    (hasOrder && /\b(my order|order number|check on)\b/.test(t))
  ) {
    return "track";
  }
  if (hasOrder && text.trim().length < 40 && !/\?/.test(t)) return "track";
  return "knowledge";
}

export function interpret(input: {
  message: string;
  history: HistoryTurn[];
  verified: VerifiedOrder[];
  failStreak: number;
}): Intent {
  const message = input.message.trim();
  const lower = message.toLowerCase();
  const userHistory = input.history.filter((turn) => turn.role === "user").map((turn) => turn.content);
  const actionSource = isEmailOnly(message) ? `${lastUserText(input.history)}\n${message}` : message;
  const orderNumber =
    extractOrders(actionSource)[0] ??
    [...userHistory].reverse().flatMap(extractOrders)[0] ??
    input.verified.at(-1)?.orderNumber;
  const emails = [
    ...extractEmails(message),
    ...userHistory.flatMap(extractEmails),
  ];
  const verifiedEmail = orderNumber
    ? input.verified.find((row) => row.orderNumber === orderNumber)?.email
    : undefined;
  const email = extractEmails(message)[0] ?? verifiedEmail ?? emails[0];

  if (
    /\b(charge[\s-]?back|dispute (the|this|my) charge|call my bank|my lawyer|an attorney|sue you|small claims|better business bureau|\bbbb\b)\b/i.test(
      lower,
    )
  ) {
    return {
      type: "handoff",
      reason: "chargeback",
      priority: "urgent",
      detail: message,
    };
  }
  if (
    input.failStreak >= 1 &&
    /\b(useless|not helping|you(?:'re| are) not helping|this sucks|worst support)\b/i.test(lower)
  ) {
    return {
      type: "handoff",
      reason: "repeated_failure",
      priority: "normal",
      detail: message,
    };
  }
  if (
    /\b(real person|human|speak to|talk to (an? )?(agent|person|someone|manager|representative)|escalate)\b/i.test(
      lower,
    )
  ) {
    return { type: "handoff", reason: "human_requested", priority: "normal", detail: message };
  }
  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(lower) && message.length < 48 && !orderNumber) {
    return { type: "greeting" };
  }
  if (/^(thanks|thank you|thx)\b/i.test(lower) && message.length < 40) return { type: "thanks" };

  const hasOrder = Boolean(orderNumber);
  const action = classify(actionSource, hasOrder);
  const needsOrder = ["track", "return", "exchange", "cancel", "refund", "goodwill"].includes(action);
  if (needsOrder && !orderNumber) return { type: "need_order", action };
  if (needsOrder && orderNumber && !email) return { type: "need_email", orderNumber, action };
  if (action === "track" && orderNumber && email) return { type: "track", orderNumber, email };
  if (action === "return" && orderNumber && email) return { type: "return", orderNumber, email, text: actionSource };
  if (action === "exchange" && orderNumber && email) {
    return { type: "exchange", orderNumber, email, text: actionSource };
  }
  if (action === "cancel" && orderNumber && email) return { type: "cancel", orderNumber, email };
  if (action === "refund" && orderNumber && email) return { type: "refund", orderNumber, email };
  if (action === "goodwill" && orderNumber && email) {
    return { type: "goodwill", orderNumber, email, text: actionSource };
  }
  if (action === "size") {
    return {
      type: "size",
      text: actionSource,
      heightIn: parseHeightInches(actionSource),
      usualSize: parseUsualSize(actionSource),
      layering: /layer/.test(actionSource.toLowerCase()),
    };
  }
  if (action === "product") return { type: "product", query: actionSource };
  return { type: "knowledge", query: actionSource };
}
