import { Suspense, type ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";
import { SiteHeader } from "@/components/site-header";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader desk />
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-tide">Operator desk</p>
            <h1 className="font-heading text-3xl text-kelp">Driftwood ledger</h1>
          </div>
          <Suspense fallback={<div className="h-8 w-48 rounded-full bg-sand/60" />}>
            <AdminNav />
          </Suspense>
        </div>
        {children}
      </div>
    </>
  );
}
