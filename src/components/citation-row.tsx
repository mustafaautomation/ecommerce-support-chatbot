"use client";

import { useEffect, useId, useState } from "react";
import type { Citation } from "@/lib/types";

export function CitationRow({ citations }: { citations: Citation[] }) {
  const unique = citations.filter((citation, index, all) => all.findIndex((item) => item.slug === citation.slug) === index).slice(0, 3);
  if (unique.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11.5px] text-muted-foreground">Sources</span>
      {unique.map((citation) => (
        <CitationChip key={citation.slug} citation={citation} />
      ))}
    </div>
  );
}

function CitationChip({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  const previewId = useId();
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <span
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <a
        data-testid="citation-chip"
        href={`/policies#${citation.slug}`}
        aria-describedby={open ? previewId : undefined}
        aria-expanded={open}
        className="inline-flex h-7 items-center rounded-full border border-border bg-surface px-2.5 text-[11.5px] text-foreground hover:bg-accent-soft focus-visible:bg-accent-soft"
        onFocus={() => setOpen(true)}
        onClick={(event) => {
          if (window.matchMedia("(pointer: coarse)").matches && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {citation.title}
      </a>
      {open ? (
        <span
          id={previewId}
          data-testid="citation-preview"
          role="tooltip"
          className="absolute bottom-full left-0 z-20 mb-1 w-64 rounded-[var(--radius-card)] border border-border bg-surface p-3 text-left shadow-[var(--shadow-card)]"
        >
          <span className="block text-sm font-semibold">{citation.title}</span>
          <span className="mt-1 block line-clamp-3 text-[13px] text-muted-foreground">{citation.section}</span>
          <a className="mt-2 inline-block text-[13px] text-accent underline" href={`/policies#${citation.slug}`} target="_blank" rel="noreferrer">
            Open source
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </span>
      ) : null}
    </span>
  );
}
