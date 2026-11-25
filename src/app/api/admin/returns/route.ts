import { connection } from "next/server";
import { getStore } from "@/lib/db";

export async function GET() {
  await connection();
  const rows = getStore().all(
    "SELECT * FROM returns ORDER BY created_at DESC",
  );
  return Response.json({ returns: rows });
}
