import React from "react";
import { Link } from "wouter";

type PolicyLayoutProps = {
  eyebrow?: string;
  title: string;
  summary: string;
  lastUpdated?: string;
  children: React.ReactNode;
};

/**
 * One date for all six policy pages, so they cannot silently drift apart.
 * Bump this whenever the substance of any policy changes — the date is a
 * customer-facing claim, not decoration.
 */
export const POLICY_LAST_UPDATED = "29 August 2026";

export const LEGAL_DETAILS = {
  // TODO(client): Update once company registration is complete.
  registeredName: "OD Fish Co. (Registration Pending)",
  gstin: "Registration in progress",
  registeredAddress: "Mumbai, Maharashtra, India",
  supportEmail: "odfishco@gmail.com",
  supportPhone: "+91 99999 99999", // Update with your actual support number
} as const;

export function PolicyLayout({
  eyebrow = "Customer information",
  title,
  summary,
  lastUpdated = POLICY_LAST_UPDATED,
  children,
}: PolicyLayoutProps) {
  return (
    <div className="bg-background text-foreground">
      <header className="bg-foreground text-background">
        <div className="container mx-auto px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-background/60">
              {eyebrow}
            </p>
            {/* Colour is explicit: a global heading rule sets h1 to the navy
                ink colour, which is invisible against this navy band. */}
            <h1 className="font-serif text-4xl font-bold leading-tight text-background md:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-background/75">{summary}</p>
            <p className="mt-8 text-sm text-background/50">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-14 md:px-8 md:py-20">
        <article className="mx-auto max-w-3xl space-y-12 text-[1.05rem] leading-8">
          {children}
          <aside className="border-t border-border pt-8 text-sm text-muted-foreground">
            Questions about this page? Please visit our{" "}
            <Link href="/contact" className="font-semibold text-primary underline underline-offset-4">
              contact page
            </Link>
            .
          </aside>
        </article>
      </div>
    </div>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl font-bold text-primary md:text-3xl">{title}</h2>
      <div className="space-y-4 text-foreground/80">{children}</div>
    </section>
  );
}

export function PolicyList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6 marker:text-primary">{children}</ul>;
}