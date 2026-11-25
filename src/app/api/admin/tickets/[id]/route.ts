import { getStore } from "@/lib/db";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { status?: string; note?: string };
  const status = body.status ?? "open";
  if (!["open", "pending", "resolved"].includes(status)) {
    return Response.json({ error: "Unknown ticket status." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const store = getStore();
  const existing = store.get("SELECT id FROM tickets WHERE id = ?", [id]);
  if (!existing) return Response.json({ error: "Ticket not found." }, { status: 404 });
  store.run("UPDATE tickets SET status = ?, note = ?, updated_at = ? WHERE id = ?", [
    status,
    body.note ?? null,
    now,
    id,
  ]);
  if (status === "resolved") {
    const ticket = store.get<{ conversation_id: string }>("SELECT conversation_id FROM tickets WHERE id = ?", [id]);
    if (ticket) {
      store.run("UPDATE conversations SET status = 'resolved' WHERE id = ?", [ticket.conversation_id]);
    }
  }
  return Response.json({ ok: true });
}
