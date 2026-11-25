"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/embed") return null;
  return (
    <footer className="mt-auto border-t border-border/80 px-4 py-4 text-center text-xs text-muted-foreground">
      Portfolio demo by Quvantic - fictional brand, not a real business / not client work
    </footer>
  );
}
