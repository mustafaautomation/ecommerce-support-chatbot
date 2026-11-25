import { getStore } from "@/lib/db";

const STATUSES = ["label_issued", "in_transit", "received", "refund_issued", "refunded", "cancelled"];

export async function PATCH(request: Request, context: { params: Promise<{ rma: string }> }) {
  const { rma } = await context.params;
  const body = (await request.json()) as { status?: string };
  if (!body.status || !STATUSES.includes(body.status)) {
    return Response.json({ error: "Unknown return status." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const store = getStore();
  const existing = store.get("SELECT rma FROM returns WHERE rma = ?", [rma]);
  if (!existing) return Response.json({ error: "Return not found." }, { status: 404 });
  store.run(
    `UPDATE returns
     SET status = ?,
         received_at = CASE WHEN ? IN ('received', 'refund_issued', 'refunded') AND received_at IS NULL THEN ? ELSE received_at END,
         refund_issued_at = CASE WHEN ? IN ('refund_issued', 'refunded') AND refund_issued_at IS NULL THEN ? ELSE refund_issued_at END
     WHERE rma = ?`,
    [body.status, body.status, now, body.status, now, rma],
  );
  return Response.json({ ok: true });
}
