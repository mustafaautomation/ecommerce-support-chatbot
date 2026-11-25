"use client";

import { ChatPanel } from "@/components/chat-panel";

export default function EmbedPage() {
  return (
    <main className="h-dvh bg-transparent">
      <ChatPanel
        fill
        showClose
        onClose={() => {
          if (window.parent !== window) window.parent.postMessage({ type: "driftwood-close" }, window.location.origin);
        }}
      />
    </main>
  );
}
