"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/components/use-fetch";

type Overview = {
  conversations: number;
  openTickets: number;
  returns: number;
  coupons: number;
};

export default function AdminHome() {
  const { data, error, loading, reload } = useFetch<Overview>("/api/admin/overview");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function reset() {
    setResetting(true);
    setResetError(null);
    try {
      const response = await fetch("/api/admin/reset", { method: "POST" });
      if (!response.ok) throw new Error("Reset failed.");
      await reload();
    } catch (caught) {
      setResetError(caught instanceof Error ? caught.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      {loading ? <p className="text-sm text-muted-foreground">Loading the ledger…</p> : null}
      {error ? (
        <p className="text-sm text-destructive">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void reload()}>
            Retry
          </button>
        </p>
      ) : null}
      {data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Conversations", data.conversations],
            ["Open tickets", data.openTickets],
            ["Returns", data.returns],
            ["Courtesy codes", data.coupons],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-xs uppercase tracking-wide text-tide">{label}</p>
              <p className="font-heading text-4xl text-kelp">{value}</p>
            </article>
          ))}
        </div>
      ) : null}
      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="font-heading text-xl text-kelp">Reset the demo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Puts the seeded orders back, clears chats, and drops returns that were started in this session. Avery’s RMA-1008 stays, because it ships with the seed.
        </p>
        <Button className="mt-3" onClick={() => void reset()} disabled={resetting}>
          {resetting ? "Resetting…" : "Reset ledger"}
        </Button>
        {resetError ? <p className="mt-2 text-sm text-destructive">{resetError}</p> : null}
      </div>
    </div>
  );
}
