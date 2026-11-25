"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function WidgetMount() {
  const pathname = usePathname();
  const hidden = pathname.startsWith("/admin") || pathname === "/embed" || pathname.startsWith("/labels");

  useEffect(() => {
    if (hidden) return;
    const existing = document.querySelector('script[src*="widget.js"]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = "/widget.js";
    script.async = true;
    script.dataset.title = "Driftwood support";
    script.dataset.nudges = pathname === "/embed-demo" ? "now" : "delay";
    if (pathname === "/" || pathname === "/embed-demo") script.dataset.teaser = "1";
    script.dataset.theme = "system";
    document.body.appendChild(script);
  }, [hidden, pathname]);

  return null;
}
