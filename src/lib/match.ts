import type { OrderItem, ReturnReason } from "@/lib/types";

export function matchItems(items: OrderItem[], text: string): OrderItem[] {
  const lower = text.toLowerCase();
  return items.filter((item) => {
    const name = item.name.toLowerCase();
    if (lower.includes(name)) return true;
    return name.split(/[^a-z0-9]+/).some((token) => token.length > 3 && lower.includes(token));
  });
}

export function detectReason(text: string): ReturnReason {
  const value = text.toLowerCase();
  if (/wrong item|not what i ordered|incorrect item/.test(value)) return "wrong_item";
  if (/defect|faulty|seam split|zipper broke/.test(value)) return "defective";
  if (/hole|torn|tear|ripped|damaged|stain/.test(value)) return "damaged";
  if (/missing|never arrived|did not arrive|didn't arrive|stolen|lost package/.test(value)) {
    return "missing";
  }
  if (/too small|too tight|runs small/.test(value)) return "too_small";
  if (/too (big|large)|too loose|runs large/.test(value)) return "too_large";
  return "changed_mind";
}
