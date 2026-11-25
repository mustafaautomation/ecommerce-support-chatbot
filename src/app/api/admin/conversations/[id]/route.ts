import { connection } from "next/server";
import { getStore } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;
  const store = getStore();
  const conversation = store.get("SELECT * FROM conversations WHERE id = ?", [id]);
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
  const messages = store.all(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    [id],
  );
  return Response.json({ conversation, messages });
}
