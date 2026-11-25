import { describe, expect, it } from "vitest";
import { loadCases, runEvalSuite, writeScorecard } from "./run";

describe("eval suite", () => {
  it("runs every offline case and writes the scorecard", () => {
    expect(loadCases().length).toBeGreaterThanOrEqual(20);
    const results = runEvalSuite();
    const summary = writeScorecard(results);
    const failed = results.filter((result) => !result.pass);
    expect(failed, failed.map((result) => `${result.id}: ${result.notes.join("; ")}`).join("\n")).toEqual([]);
    expect(summary.passed).toBe(summary.total);
  });
});
