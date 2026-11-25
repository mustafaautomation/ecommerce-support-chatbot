import { connection } from "next/server";
import { getStore } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json({
    tickets: getStore().all("SELECT * FROM tickets ORDER BY created_at DESC"),
  });
}
