"use client";

import Link from "next/link";

export function SiteHeader({ desk = false }: { desk?: boolean }) {
  return (
    <header className="border-b border-border/80 bg-foam/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-kelp text-sand">
            <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
              <path
                d="M3 18c4-5 7-5 11 0s7 5 11 0 4-5 4-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>
            <span className="font-heading block text-lg leading-none text-kelp">Driftwood Outfitters</span>
            <span className="text-xs tracking-wide text-muted-foreground">Grayhaven, Oregon · support desk</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link className="rounded-full px-3 py-1.5 hover:bg-sand/70" href="/">
            Shop chat
          </Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-sand/70" href="/policies">
            Notes
          </Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-sand/70" href="/embed-demo">
            Embed
          </Link>
          <Link
            className={`rounded-full px-3 py-1.5 ${desk ? "bg-kelp text-primary-foreground" : "hover:bg-sand/70"}`}
            href="/admin"
          >
            Desk
          </Link>
        </nav>
      </div>
    </header>
  );
}
