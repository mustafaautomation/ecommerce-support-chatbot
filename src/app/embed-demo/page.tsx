import Script from "next/script";
import { SiteHeader } from "@/components/site-header";

export default function EmbedDemoPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <p className="text-xs uppercase tracking-[0.18em] text-tide">Sample host site</p>
        <h1 className="font-heading text-4xl text-kelp">Harbor notes</h1>
        <p className="mt-3 text-sm leading-relaxed">
          This page pretends to be a Driftwood journal. The support widget is not built into the layout. It is injected by one script tag, the same snippet a shop would paste into its site.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-kelp p-4 text-xs text-sand">
          {`<script src="/widget.js" data-title="Driftwood support" async></script>`}
        </pre>
        <article className="prose mt-8 space-y-3 text-sm leading-relaxed">
          <p>
            The Cedar Rain Shell is cut for a wet commute and a windy ridge. Pit zips, a helmet hood, and a membrane we actually stand behind.
          </p>
          <p>
            If a parcel is late, open the chat. Rowan can read the Northline timeline once you share the order number and the checkout email.
          </p>
        </article>
      </main>
      <Script src="/widget.js" strategy="afterInteractive" />
    </>
  );
}
