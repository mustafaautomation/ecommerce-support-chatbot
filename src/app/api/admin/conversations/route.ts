import { connection } from "next/server";
import { getStore } from "@/lib/db";

export async function GET() {
  await connection();
  const conversations = getStore().all(
    `SELECT id, created_at, updated_at, customer_email, status, summary, fail_streak
     FROM conversations ORDER BY updated_at DESC`,
  );
  return Response.json({ conversations });
}
