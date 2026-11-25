import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ARTICLES } from "@/lib/kb";

export const metadata: Metadata = {
  title: "Shop notes · Driftwood Outfitters",
  description: "Shipping, returns, sizing, care, and the other notes Rowan is allowed to quote.",
};

export default function PoliciesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <p className="text-xs uppercase tracking-[0.18em] text-tide">Knowledge base</p>
        <h1 className="font-heading text-4xl text-kelp">Shop notes</h1>
        <p className="mt-2 text-muted-foreground">
          Rowan quotes these notes and cites the section. If a note doesn’t cover the question, the desk says so.
        </p>
        <div className="mt-8 space-y-10">
          {ARTICLES.map((article) => (
            <article key={article.slug} id={article.slug} className="scroll-mt-6">
              <h2 className="font-heading text-2xl text-kelp">{article.title}</h2>
              <div className="mt-3 space-y-4">
                {article.sections.map((section) => (
                  <section key={section.heading}>
                    <h3 className="text-sm font-medium uppercase tracking-wide text-copper">{section.heading}</h3>
                    <p className="mt-1 text-sm leading-relaxed">{section.body}</p>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
