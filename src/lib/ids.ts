import type { Store } from "@/lib/db";

export function nextNumber(store: Store, key: string, prefix: string, start: number): string {
  const row = store.get<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]);
  const current = row ? Number(row.value) : start - 1;
  const next = current + 1;
  if (row) store.run("UPDATE meta SET value = ? WHERE key = ?", [String(next), key]);
  else store.run("INSERT INTO meta (key, value) VALUES (?, ?)", [key, String(next)]);
  return `${prefix}${next}`;
}

export function couponCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `DW-CARE-${suffix}`;
}

export function randomId(prefix: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hex}`;
}
