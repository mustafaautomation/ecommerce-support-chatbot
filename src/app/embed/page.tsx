"use client";

import { useEffect } from "react";
import { ChatPanel } from "@/components/chat-panel";

export default function EmbedPage() {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && window.parent !== window) {
        window.parent.postMessage({ type: "driftwood-close" }, window.location.origin);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <main className="h-dvh bg-foam">
      <ChatPanel fill />
    </main>
  );
}
