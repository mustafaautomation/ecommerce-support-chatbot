import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { runTurn } from "@/lib/agent";
import { resetStore } from "@/lib/db";
import type { TurnResult } from "@/lib/types";

type TurnSpec = {
  user: string;
  includes?: string[];
  forbids?: string[];
  cards?: string[];
  handoff?: boolean;
  citation?: string;
};

type CaseSpec = {
  id: string;
  turns: TurnSpec[];
};

export type CaseResult = {
  id: string;
  pass: boolean;
  notes: string[];
};

function checkTurn(spec: TurnSpec, result: TurnResult, notes: string[]) {
  const haystack = result.text.toLowerCase();
  for (const needle of spec.includes ?? []) {
    if (!haystack.includes(needle.toLowerCase())) notes.push(`missing “${needle}”`);
  }
  for (const needle of spec.forbids ?? []) {
    if (haystack.includes(needle.toLowerCase())) notes.push(`unexpected “${needle}”`);
  }
  if (spec.cards) {
    const present = new Set(result.cards.map((card) => card.type));
    for (const card of spec.cards) {
      if (!present.has(card as TurnResult["cards"][number]["type"])) notes.push(`missing card ${card}`);
    }
    if (spec.cards.length === 0 && result.cards.length > 0) {
      notes.push(`expected no cards, saw ${result.cards.map((card) => card.type).join(",")}`);
    }
  }
  if (spec.handoff !== undefined && result.handoff !== spec.handoff) {
    notes.push(`handoff ${result.handoff}, expected ${spec.handoff}`);
  }
  if (spec.citation && !result.citations.some((citation) => citation.slug === spec.citation)) {
    notes.push(`missing citation ${spec.citation}`);
  }
}

export function loadCases(): CaseSpec[] {
  const file = path.join(process.cwd(), "evals", "cases.yaml");
  return parse(fs.readFileSync(file, "utf8")) as CaseSpec[];
}

export function runEvalSuite(): CaseResult[] {
  const cases = loadCases();
  const results: CaseResult[] = [];
  for (const item of cases) {
    resetStore();
    let conversationId: string | null = null;
    const notes: string[] = [];
    for (const turn of item.turns) {
      const result = runTurn(conversationId, turn.user);
      conversationId = result.conversationId;
      checkTurn(turn, result, notes);
    }
    results.push({ id: item.id, pass: notes.length === 0, notes });
  }
  return results;
}

export function writeScorecard(results: CaseResult[]) {
  const dir = path.join(process.cwd(), "evals", "out");
  fs.mkdirSync(dir, { recursive: true });
  const passed = results.filter((result) => result.pass).length;
  const lines = [
    "# Driftwood eval scorecard",
    "",
    `Offline engine. ${passed}/${results.length} passed.`,
    "",
    "| Case | Result | Notes |",
    "| --- | --- | --- |",
    ...results.map(
      (result) => `| ${result.id} | ${result.pass ? "pass" : "fail"} | ${result.notes.join("; ") || ""} |`,
    ),
    "",
  ];
  fs.writeFileSync(path.join(dir, "scorecard.md"), lines.join("\n"));
  fs.writeFileSync(
    path.join(dir, "scorecard.json"),
    JSON.stringify({ passed, total: results.length, results }, null, 2),
  );
  return { passed, total: results.length };
}
