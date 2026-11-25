import { connection } from "next/server";
import { getStore } from "@/lib/db";
import { getOrder } from "@/lib/orders";
import type { OrderItem } from "@/lib/types";

export async function GET(_request: Request, context: { params: Promise<{ rma: string }> }) {
  await connection();
  const { rma } = await context.params;
  const row = getStore().get<{
    rma: string;
    order_number: string;
    email: string;
    reason: string;
    kind: string;
    replacement_size: string | null;
    status: string;
    label_fee_cents: number;
    refund_cents: number | null;
    items_json: string;
    created_at: string;
  }>("SELECT * FROM returns WHERE rma = ?", [rma]);
  if (!row) return Response.json({ error: "Label not found." }, { status: 404 });
  const order = getOrder(getStore(), row.order_number);
  const items = JSON.parse(row.items_json) as OrderItem[];
  return Response.json({
    rma: row.rma,
    orderNumber: row.order_number,
    email: row.email,
    reason: row.reason,
    kind: row.kind,
    replacementSize: row.replacement_size,
    status: row.status,
    labelFeeCents: row.label_fee_cents,
    refundCents: row.refund_cents,
    createdAt: row.created_at,
    items,
    customerName: order?.customerName ?? "Driftwood customer",
    city: order?.city ?? "",
    region: order?.region ?? "",
    country: order?.country ?? "",
    carrier: order?.carrier ?? "Northline Freight",
  });
}
