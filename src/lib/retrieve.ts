import { ARTICLES } from "@/lib/kb";
import type { Citation } from "@/lib/types";

export type Chunk = Citation & { text: string };

const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "and",
  "or",
  "for",
  "in",
  "on",
  "is",
  "are",
  "my",
  "your",
  "do",
  "you",
  "we",
  "our",
  "it",
  "this",
  "that",
  "with",
  "from",
  "at",
  "be",
  "if",
  "can",
  "i",
  "me",
  "how",
  "what",
  "when",
  "does",
  "did",
  "was",
  "about",
  "please",
]);

const BOOSTS: { pattern: RegExp; slug: string }[] = [
  { pattern: /return|exchange|final sale|rma|send (it|them) back/, slug: "returns" },
  { pattern: /refund|money back|reimburse/, slug: "refunds" },
  { pattern: /ship|delivery|overnight|express|ground|cancel/, slug: "shipping" },
  { pattern: /international|canada|united kingdom|\buk\b|europe|duties|customs/, slug: "international" },
  { pattern: /size|fit|chest|inseam|beanie/, slug: "sizing" },
  { pattern: /wash|care|dwr|merino|down|clean/, slug: "care" },
  { pattern: /warrant/, slug: "warranty" },
  { pattern: /promo|coupon|welcome10|discount|courtesy/, slug: "promos" },
  { pattern: /pay|visa|paypal|gift card|amex|mastercard|drift pay/, slug: "payments" },
  { pattern: /password|account|login|sign in|guest/, slug: "account" },
];

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9$%.'-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length > 1 && !STOP.has(token));
}

const DIM = 192;

function hash32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Local hashed embedding. No network and no model download. */
export function embedTokens(tokens: string[]): Float64Array {
  const vector = new Float64Array(DIM);
  for (const token of tokens) {
    const tokenHash = hash32(token);
    vector[tokenHash % DIM] += (tokenHash & 2) === 0 ? 1 : -1;
    const padded = ` ${token} `;
    for (let index = 0; index < padded.length - 2; index += 1) {
      const triHash = hash32(padded.slice(index, index + 3));
      vector[triHash % DIM] += (triHash & 2) === 0 ? 0.35 : -0.35;
    }
  }
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (let index = 0; index < DIM; index += 1) vector[index] /= norm;
  return vector;
}

export function cosine(left: Float64Array, right: Float64Array): number {
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) dot += left[index] * right[index];
  return dot;
}

export function allChunks(): Chunk[] {
  return ARTICLES.flatMap((article) =>
    article.sections.map((section) => ({
      slug: article.slug,
      title: article.title,
      section: section.heading,
      text: section.body,
    })),
  );
}

export function retrieve(query: string, k = 4): { chunk: Chunk; score: number }[] {
  const chunks = allChunks();
  const queryTokens = tokenize(query);
  const docs = chunks.map((chunk) => tokenize(`${chunk.title} ${chunk.section} ${chunk.text}`));
  const avg = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length;
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const token of new Set(doc)) df.set(token, (df.get(token) ?? 0) + 1);
  }
  const k1 = 1.2;
  const b = 0.75;
  const lower = query.toLowerCase();
  const boosted = new Set(BOOSTS.filter((boost) => boost.pattern.test(lower)).map((boost) => boost.slug));

  const queryVector = embedTokens(queryTokens);
  const chunkVectors = docs.map((doc) => embedTokens(doc));
  const lexical = chunks.map((chunk, index) => {
    const doc = docs[index];
    const tf = new Map<string, number>();
    for (const token of doc) tf.set(token, (tf.get(token) ?? 0) + 1);
    let score = 0;
    for (const token of queryTokens) {
      const freq = tf.get(token) ?? 0;
      if (!freq) continue;
      const n = df.get(token) ?? 0;
      const idf = Math.log(1 + (chunks.length - n + 0.5) / (n + 0.5));
      const denom = freq + k1 * (1 - b + (b * doc.length) / avg);
      score += idf * ((freq * (k1 + 1)) / denom);
    }
    return score;
  });
  const maxLexical = Math.max(...lexical, 0.0001);
  const ranked = chunks.map((chunk, index) => {
    const bm25 = lexical[index];
    const semantic = Math.max(0, cosine(queryVector, chunkVectors[index]));
    let score = 0;
    if (bm25 > 0 || boosted.has(chunk.slug)) {
      score = 0.65 * (bm25 / maxLexical) + 0.35 * semantic;
      if (boosted.has(chunk.slug)) score += 0.45;
    } else if (semantic > 0.86) {
      score = semantic;
    }
    return { chunk, score };
  });

  return ranked
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function confident(hits: { score: number }[]): boolean {
  return hits.length > 0 && hits[0].score >= 0.7;
}
