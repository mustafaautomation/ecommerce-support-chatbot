import { getStore } from "@/lib/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = getStore();
  const existing = store.get("SELECT id FROM conversations WHERE id = ?", [id]);
  if (!existing) return Response.json({ error: "Conversation not found." }, { status: 404 });
  store.run("UPDATE conversations SET status = 'open', updated_at = ? WHERE id = ?", [new Date().toISOString(), id]);
  return Response.json({ ok: true, status: "open" });
}
