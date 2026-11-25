import { z } from "zod";

export const orderNumberSchema = z
  .string()
  .trim()
  .regex(/^DW-\d{4,6}$/i, "Order numbers look like DW-10482.");

export const emailSchema = z.string().trim().email("That email address is not valid.");

export const lookupSchema = z.object({
  orderNumber: orderNumberSchema,
  email: emailSchema,
});

export const returnSchema = lookupSchema.extend({
  itemIds: z.array(z.string().min(1)).min(1),
  reason: z.enum([
    "changed_mind",
    "too_small",
    "too_large",
    "not_as_expected",
    "damaged",
    "defective",
    "wrong_item",
    "missing",
  ]),
  kind: z.enum(["return", "exchange"]).optional(),
  replacementSize: z.string().min(1).max(8).optional(),
});

export const goodwillSchema = lookupSchema.extend({
  note: z.string().min(1).max(2000),
});

export const knowledgeSchema = z.object({
  query: z.string().trim().min(2).max(500),
});

export const productSchema = z.object({
  query: z.string().trim().min(2).max(300),
});

export const sizeSchema = z.object({
  query: z.string().trim().min(2).max(300),
  heightIn: z.number().min(48).max(90).optional(),
  usualSize: z.string().max(8).optional(),
  layering: z.boolean().optional(),
});

export const handoffSchema = z.object({
  reason: z.string().trim().min(2).max(80),
  priority: z.enum(["normal", "high", "urgent"]).optional(),
});

export const TOOL_NAMES = [
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
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export function openaiToolDefs() {
  return [
    {
      type: "function",
      function: {
        name: "search_knowledge",
        description: "Retrieve Driftwood shop notes. Use for shipping, returns, sizing, care, warranty, promos, payments, and account questions.",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "lookup_order",
        description: "Look up one order. Requires the order number and the checkout email. Never call this without both.",
        parameters: {
          type: "object",
          properties: { orderNumber: { type: "string" }, email: { type: "string" } },
          required: ["orderNumber", "email"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "track_shipment",
        description: "Order summary plus the carrier timeline. Requires order number and checkout email.",
        parameters: {
          type: "object",
          properties: { orderNumber: { type: "string" }, email: { type: "string" } },
          required: ["orderNumber", "email"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "start_return",
        description: "Start a return for specific item ids after the order is verified. Policy checks run in code.",
        parameters: {
          type: "object",
          properties: {
            orderNumber: { type: "string" },
            email: { type: "string" },
            itemIds: { type: "array", items: { type: "string" } },
            reason: { type: "string" },
          },
          required: ["orderNumber", "email", "itemIds", "reason"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "start_exchange",
        description: "Start a size exchange. Requires the replacement size.",
        parameters: {
          type: "object",
          properties: {
            orderNumber: { type: "string" },
            email: { type: "string" },
            itemIds: { type: "array", items: { type: "string" } },
            reason: { type: "string" },
            replacementSize: { type: "string" },
          },
          required: ["orderNumber", "email", "itemIds", "reason", "replacementSize"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_refund_status",
        description: "Read refund state for a verified order.",
        parameters: {
          type: "object",
          properties: { orderNumber: { type: "string" }, email: { type: "string" } },
          required: ["orderNumber", "email"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "product_search",
        description: "Search the Driftwood catalog.",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "size_recommendation",
        description: "Recommend a size from the published chart.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
            heightIn: { type: "number" },
            usualSize: { type: "string" },
            layering: { type: "boolean" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "apply_goodwill_coupon",
        description: "Issue one courtesy code when policy allows. The amount is computed in code, never by the model.",
        parameters: {
          type: "object",
          properties: {
            orderNumber: { type: "string" },
            email: { type: "string" },
            note: { type: "string" },
          },
          required: ["orderNumber", "email", "note"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "cancel_order",
        description: "Cancel an order only when it is still processing.",
        parameters: {
          type: "object",
          properties: { orderNumber: { type: "string" }, email: { type: "string" } },
          required: ["orderNumber", "email"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "handoff_to_agent",
        description: "Hand the conversation to a person. Use for chargebacks, high-value damage, missing parcels, or when the shopper asks.",
        parameters: {
          type: "object",
          properties: {
            reason: { type: "string" },
            priority: { type: "string", enum: ["normal", "high", "urgent"] },
          },
          required: ["reason"],
        },
      },
    },
  ];
}
