import { getStore } from "@/lib/db";
import { randomId } from "@/lib/ids";
import { runAgentTurn } from "@/lib/llm";
import { logSafe, maskPii } from "@/lib/pii";

export const DEMO_VERIFY_TOKEN = "driftwood-demo-verify";

export type Outbound = { to: string; text: string; channel: "whatsapp" | "messenger" };

function verifyToken(envName: string): string {
  return process.env[envName] || DEMO_VERIFY_TOKEN;
}

export function verifyChallenge(url: URL, envName: string): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === verifyToken(envName) && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

function linkedConversation(channel: string, externalId: string): string {
  const store = getStore();
  const row = store.get<{ conversation_id: string }>(
    "SELECT conversation_id FROM channel_links WHERE channel = ? AND external_id = ?",
    [channel, externalId],
  );
  if (row) return row.conversation_id;
  const id = randomId("c");
  const now = new Date().toISOString();
  store.run(
    `INSERT INTO conversations (id, created_at, updated_at, customer_email, status, verified_json, fail_streak, summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, now, now, null, "open", "[]", 0, null],
  );
  store.run("INSERT INTO channel_links (channel, external_id, conversation_id) VALUES (?, ?, ?)", [
    channel,
    externalId,
    id,
  ]);
  return id;
}

export function whatsAppMessages(body: unknown): { from: string; text: string }[] {
  const root = body as {
    entry?: { changes?: { value?: { messages?: { from?: string; type?: string; text?: { body?: string } }[] } }[] }[];
  };
  const found: { from: string; text: string }[] = [];
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.type && message.type !== "text") continue;
        const text = message.text?.body?.trim();
        if (message.from && text) found.push({ from: message.from, text });
      }
    }
  }
  return found;
}

export function messengerMessages(body: unknown): { from: string; text: string }[] {
  const root = body as {
    entry?: { messaging?: { sender?: { id?: string }; message?: { text?: string; is_echo?: boolean } }[] }[];
  };
  const found: { from: string; text: string }[] = [];
  for (const entry of root.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      if (event.message?.is_echo) continue;
      const text = event.message?.text?.trim();
      const from = event.sender?.id;
      if (from && text) found.push({ from, text });
    }
  }
  return found;
}

async function reply(
  channel: "whatsapp" | "messenger",
  from: string,
  text: string,
): Promise<Outbound> {
  const conversationId = linkedConversation(channel, from);
  const turn = await runAgentTurn(conversationId, text);
  const outbound = { to: from, text: turn.text, channel };
  logSafe(`${channel}-outbound`, `to=${from} ${turn.text}`);
  return outbound;
}

export async function handleWhatsApp(body: unknown): Promise<{ replies: Outbound[] }> {
  const replies: Outbound[] = [];
  for (const message of whatsAppMessages(body)) {
    replies.push(await reply("whatsapp", message.from, message.text));
  }
  return { replies };
}

export async function handleMessenger(body: unknown): Promise<{ replies: Outbound[] }> {
  const replies: Outbound[] = [];
  for (const message of messengerMessages(body)) {
    replies.push(await reply("messenger", message.from, message.text));
  }
  return { replies };
}

export function maskOutbound(outbound: Outbound): Outbound {
  return { ...outbound, text: maskPii(outbound.text), to: maskPii(outbound.to) };
}
