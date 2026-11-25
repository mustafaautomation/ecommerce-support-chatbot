import { connection } from "next/server";
import { getStore } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json({
    coupons: getStore().all("SELECT * FROM coupons ORDER BY created_at DESC"),
    audit: getStore().all("SELECT * FROM audit ORDER BY id DESC LIMIT 40"),
  });
}
