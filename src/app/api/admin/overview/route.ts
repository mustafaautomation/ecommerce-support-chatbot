import { connection } from "next/server";
import { getStore } from "@/lib/db";

export async function GET() {
  await connection();
  const store = getStore();
  const conversations = store.get<{ n: number }>("SELECT COUNT(*) AS n FROM conversations")?.n ?? 0;
  const openTickets = store.get<{ n: number }>("SELECT COUNT(*) AS n FROM tickets WHERE status != 'resolved'")?.n ?? 0;
  const returns = store.get<{ n: number }>("SELECT COUNT(*) AS n FROM returns")?.n ?? 0;
  const coupons = store.get<{ n: number }>("SELECT COUNT(*) AS n FROM coupons")?.n ?? 0;
  return Response.json({ conversations, openTickets, returns, coupons });
}
