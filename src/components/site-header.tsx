"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader({ desk = false }: { desk?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-foreground">
            <BrandMark />
          </span>
          <span>
            <span className="block text-[15px] font-semibold leading-none tracking-tight">Driftwood Outfitters</span>
            <span className="text-xs text-muted-foreground">Grayhaven, Oregon</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link className="hidden rounded-full px-3 py-1.5 hover:bg-accent-soft sm:inline" href="/#how-it-works">
            How it works
          </Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-accent-soft" href="/#live-chat">
            Live chat
          </Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-accent-soft" href="/admin">
            Admin
          </Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-accent-soft" href="/embed-demo">
            Embed
          </Link>
          <button
            type="button"
            data-testid="theme-toggle"
            aria-label={resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"}
            className="grid size-9 place-items-center rounded-full hover:bg-accent-soft"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 ${desk ? "bg-accent text-accent-foreground" : "bg-accent text-accent-foreground"}`}
            onClick={() => {
              document.getElementById("live-chat")?.scrollIntoView({ behavior: "smooth" });
              window.postMessage({ type: "driftwood-open" }, window.location.origin);
            }}
          >
            Open the desk
          </button>
        </nav>
      </div>
    </header>
  );
}
