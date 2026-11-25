import { resetStore } from "@/lib/db";

export function POST() {
  resetStore();
  return Response.json({ ok: true });
}
