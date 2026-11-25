import { Suspense } from "react";
import ConversationDetail from "@/components/conversation-detail";

export default function ConversationPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the transcript…</p>}>
      <ConversationDetail />
    </Suspense>
  );
}
