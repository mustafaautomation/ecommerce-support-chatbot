import { articleText } from "@/lib/kb";
import { confident, retrieve, type Chunk } from "@/lib/retrieve";
import type { Citation } from "@/lib/types";

type Template = {
  slug: string;
  requires: string[];
  text: string;
};

const TEMPLATES: Template[] = [
  {
    slug: "shipping",
    requires: ["4–7", "$75", "1pm PT"],
    text: "Drift Ground takes 4–7 business days in the contiguous US. It’s free on orders of $75 or more, and $6.50 below that. Harbor Air is 2–3 business days ($14). Gale Express overnight is $28 if you order before 1pm PT, and it doesn’t go to PO boxes, Alaska, or Hawaii. Orders placed before 1pm PT ship the same business day from Grayhaven, Oregon. An order can be cancelled only before a shipping label exists.",
  },
  {
    slug: "international",
    requires: ["Canada", "United Kingdom"],
    text: "We ship to Canada in 6–10 business days for $18. Duties and taxes are unpaid, so the carrier collects them on delivery. We don’t currently ship to the United Kingdom, the EU, or anywhere outside the US and Canada.",
  },
  {
    slug: "returns",
    requires: ["30 days", "Final sale", "$7.95"],
    text: "You have 30 days from the delivery date. Items should be unworn, with tags on. Final sale pieces — socks, swim, and anything marked Final Sale — can’t come back for fit or a change of mind. If a final-sale item arrives damaged, we still take it. Change-of-mind returns use a prepaid label and we deduct $7.95. Damaged, defective, and wrong-item returns have no label fee. A size exchange ships when the carrier scans the return.",
  },
  {
    slug: "refunds",
    requires: ["2 business days", "5–7"],
    text: "We issue the refund to the original payment method within 2 business days of the warehouse receiving the return. Cards then take 5–7 business days, PayPal takes 1–2 days, and Drift Pay takes about 3 business days.",
  },
  {
    slug: "sizing",
    requires: ["5'8\"", "one size"],
    text: "Shells, fleece, and the Northline Parka share one chart. Medium fits a 38–40 in chest and about 5'8\"–5'11\". If you’re between sizes, or layering a fleece under a shell, size up. Drift Pants are waist sizes 28–38. Approach shoes follow your usual US street size. The Trail Wool Beanie is one size for a 21–24 inch head.",
  },
  {
    slug: "care",
    requires: ["fabric softener", "down-specific"],
    text: "Wipe a rain shell clean, and when you do wash it, use cold water and a technical wash — no fabric softener. Tumble it briefly on low to refresh the DWR. Wash merino cold and lay it flat. Down gets a down-specific wash and a low dry with dryer balls.",
  },
  {
    slug: "warranty",
    requires: ["lifetime warranty", "seams and zippers"],
    text: "Driftwood shells and pants carry a lifetime warranty on seams and zippers against manufacturing defects. It doesn’t cover abrasion, burns, or ordinary wear, and it isn’t a way to return something for fit. A claim needs the order number and photos.",
  },
  {
    slug: "promos",
    requires: ["WELCOME10", "10%", "$25"],
    text: "WELCOME10 is 10% off a first order of $50 or more. It skips final sale and doesn’t stack. Free shipping starts at $75 before discounts. If we miss a delivery promise by more than 2 days, a courtesy code can be 10% off a future order, capped at $25, once per order, and only when the order is $400 or under. I can’t invent a bigger code.",
  },
  {
    slug: "payments",
    requires: ["Visa", "gift cards"],
    text: "We take Visa, Mastercard, American Express, PayPal, Drift Pay, and Driftwood gift cards. Gift cards don’t expire and can’t be cashed out. We don’t take checks or cash on delivery. Don’t send a full card number or a password in this chat.",
  },
  {
    slug: "account",
    requires: ["email used at checkout", "30 minutes"],
    text: "You don’t need an account to check an order. I need the order number and the email used at checkout before I open anything. Password reset links last 30 minutes and come from the account page — don’t type a password here. A shipping address can change only before the label is created.",
  },
];

function citationsFor(chunks: Chunk[]): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const chunk of chunks) {
    const key = `${chunk.slug}:${chunk.section}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({ slug: chunk.slug, title: chunk.title, section: chunk.section });
  }
  return citations;
}

export function answerQuestion(query: string): {
  text: string;
  citations: Citation[];
  grounded: boolean;
} {
  const hits = retrieve(query, 4);
  if (!confident(hits)) {
    return {
      text: "I don’t have a Driftwood note that answers that. I can track an order, start a return, or hand this to a person on the desk.",
      citations: [],
      grounded: false,
    };
  }
  const topSlug = hits[0].chunk.slug;
  const template = TEMPLATES.find((item) => item.slug === topSlug);
  const source = articleText(topSlug);
  const templateOk =
    template &&
    template.requires.every((phrase) => source.includes(phrase));
  if (template && templateOk) {
    const supporting = hits.filter((hit) => hit.chunk.slug === topSlug).slice(0, 2);
    return {
      text: template.text,
      citations: citationsFor(supporting.map((hit) => hit.chunk)),
      grounded: true,
    };
  }
  const sentences = hits
    .slice(0, 2)
    .map((hit) => hit.chunk.text.trim())
    .filter((text, index, all) => all.indexOf(text) === index);
  return {
    text: sentences.join(" "),
    citations: citationsFor(hits.slice(0, 2).map((hit) => hit.chunk)),
    grounded: true,
  };
}
