"use client";

import { AdminInbox } from "@/components/admin-inbox";

export default function ConversationsPage() {
  return (
    <AdminInbox>
      <p className="text-sm text-muted-foreground">Select a conversation. The shop chat writes each turn here, including the tools Rowan called.</p>
    </AdminInbox>
  );
}
