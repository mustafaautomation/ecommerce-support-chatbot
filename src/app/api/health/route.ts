import { BRAND } from "@/lib/constants";

export function GET() {
  return Response.json({ ok: true, brand: BRAND, provider: process.env.LLM_PROVIDER ?? "mock" });
}
