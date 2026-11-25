"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/returns", label: "Returns" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/conversations", label: "Conversations" },
  { href: "/admin/coupons", label: "Coupons" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${active ? "bg-kelp text-primary-foreground" : "bg-card ring-1 ring-border"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
