import { connection } from "next/server";
import { getStore } from "@/lib/db";
import { getOrder } from "@/lib/orders";
import { buildLabelPdf } from "@/lib/pdf";
import type { OrderItem } from "@/lib/types";

export async function GET(_request: Request, context: { params: Promise<{ rma: string }> }) {
  await connection();
  const { rma } = await context.params;
  const row = getStore().get<{
    rma: string;
    order_number: string;
    items_json: string;
  }>("SELECT rma, order_number, items_json FROM returns WHERE rma = ?", [rma]);
  if (!row) return Response.json({ error: "Label not found." }, { status: 404 });
  const order = getOrder(getStore(), row.order_number);
  const items = JSON.parse(row.items_json) as OrderItem[];
  const pdf = buildLabelPdf({
    rma: row.rma,
    orderNumber: row.order_number,
    customerName: order?.customerName ?? "Driftwood customer",
    city: order?.city ?? "Grayhaven",
    region: order?.region ?? "OR",
    country: order?.country ?? "US",
    items: items.map((item) => `${item.name} (${item.size})`),
    carrier: order?.carrier ?? "Northline Freight",
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${row.rma}.pdf"`,
    },
  });
}
