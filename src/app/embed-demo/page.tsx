import { SiteHeader } from "@/components/site-header";
import { BRAND } from "@/lib/brand";

export default function EmbedDemoPage() {
  return (
    <>
      <p className="bg-accent px-4 py-2 text-center text-xs text-accent-foreground">
        This is how the embed looks on a real site. The banner is part of the demo, not the shop page.
      </p>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-28">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Harbor journal</p>
        <h1 className="mt-2 text-4xl font-medium tracking-tight">Harbor notes</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The Cedar Rain Shell is cut for a wet commute and a windy ridge. Pit zips, a helmet hood, and a membrane we stand behind.
        </p>
        <p className="mt-3 text-sm leading-relaxed">
          If a parcel is late, use the chat. Rowan can read the Northline timeline once you share the order number and the checkout email.
        </p>
        <p className="mt-8 text-xs text-muted-foreground">{BRAND.disclaimer}</p>
      </main>
    </>
  );
}
