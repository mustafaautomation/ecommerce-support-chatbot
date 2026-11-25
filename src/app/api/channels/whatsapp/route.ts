import { handleWhatsApp, verifyChallenge } from "@/lib/channels";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  return verifyChallenge(new URL(request.url), "WHATSAPP_VERIFY_TOKEN");
}

export async function POST(request: Request) {
  await connection();
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a WhatsApp webhook payload." }, { status: 400 });
  }
  const result = await handleWhatsApp(body);
  return Response.json({ ok: true, replies: result.replies });
}
