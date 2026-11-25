export const BRAND = {
  name: "Driftwood Outfitters",
  bot: "Rowan",
  role: "Driftwood desk · AI agent",
  human: "Mara Ellison",
  humanRole: "Mara Ellison · human specialist",
  city: "Grayhaven, Oregon",
  disclaimer: "Portfolio demo by Quvantic - fictional brand, not a real business / not client work",
  placeholder: "Ask about an order, a return, or a size…",
  humanPlaceholder: "Message Mara Ellison…",
  greeting:
    "Hi, I’m Rowan. I can track a Driftwood order, start a return, or read the shop notes on shipping, sizing, and care. Orders open only with the number and the checkout email.",
} as const;

export const NUDGE_PILLS = [
  { label: "Track my order", prompt: "Track my order" },
  { label: "Start a return", prompt: "Start a return" },
] as const;

export const STARTER_TILES = [
  { label: "Where is my order #DW-10482?", icon: "package" },
  { label: "What’s your return policy?", icon: "rotate" },
  { label: "What size rain shell should I get?", icon: "ruler" },
  { label: "Talk to a person", icon: "headphones" },
] as const;

export const METRICS = [
  { label: "KB guides", value: "27" },
  { label: "Evals in CI", value: "26" },
  { label: "Tools", value: "11" },
  { label: "Replies", value: "Seconds" },
] as const;
