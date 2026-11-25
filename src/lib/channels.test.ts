import { beforeEach, describe, expect, it } from "vitest";
import { handleMessenger, handleWhatsApp, verifyChallenge, whatsAppMessages } from "@/lib/channels";
import { resetStore } from "@/lib/db";

beforeEach(() => {
  resetStore();
});

describe("channel adapters", () => {
  it("verifies the WhatsApp hub challenge and rejects a bad token", () => {
    const ok = verifyChallenge(
      new URL("http://localhost/api/channels/whatsapp?hub.mode=subscribe&hub.verify_token=driftwood-demo-verify&hub.challenge=88421"),
      "WHATSAPP_VERIFY_TOKEN",
    );
    expect(ok.status).toBe(200);
    const denied = verifyChallenge(
      new URL("http://localhost/api/channels/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=88421"),
      "WHATSAPP_VERIFY_TOKEN",
    );
    expect(denied.status).toBe(403);
  });

  it("maps a WhatsApp text payload onto Rowan", async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "15555550199",
                    id: "wamid.demo",
                    type: "text",
                    text: { body: "How long does standard shipping take?" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(whatsAppMessages(payload)).toHaveLength(1);
    const result = await handleWhatsApp(payload);
    expect(result.replies[0]?.text).toContain("4–7");
    expect(result.replies[0]?.to).toBe("15555550199");
  });

  it("maps a Messenger payload and ignores echoes", async () => {
    const result = await handleMessenger({
      entry: [
        {
          messaging: [
            { sender: { id: "psid-1" }, message: { text: "What is your return policy?" } },
            { sender: { id: "page" }, message: { is_echo: true, text: "ignore me" } },
          ],
        },
      ],
    });
    expect(result.replies).toHaveLength(1);
    expect(result.replies[0]?.text.toLowerCase()).toContain("30 days");
  });
});
