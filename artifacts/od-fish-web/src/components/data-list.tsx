import React from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The phone counterpart to a `<Table>`.
 *
 * Admin pages render both and let the breakpoint choose: the table goes inside
 * a `hidden md:block` wrapper, and this list carries its own `md:hidden`. A
 * five-to-seven column table cannot be squeezed into 402px without either
 * horizontal scrolling (which hides the columns that matter) or type so small
 * it cannot be read one-handed at a delivery door.
 */
export function DataList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul className={cn("divide-y divide-border md:hidden", className)}>
      {children}
    </ul>
  );
}

interface DataListItemProps {
  /** Renders the whole card as a link. Mutually exclusive with `onClick`. */
  href?: string;
  onClick?: () => void;
  /** Primary identifier — order number, product name, staff name. */
  title: React.ReactNode;
  /** One line under the title: phone number, SKU, email. */
  subtitle?: React.ReactNode;
  /** Top-right corner — usually a status badge or an amount. */
  trailing?: React.ReactNode;
  /** `DataListField` rows. */
  children?: React.ReactNode;
  /** Buttons pinned to the bottom of the card, full width and thumb-sized. */
  actions?: React.ReactNode;
  className?: string;
}

export function DataListItem({
  href,
  onClick,
  title,
  subtitle,
  trailing,
  children,
  actions,
  className,
}: DataListItemProps) {
  const interactive = Boolean(href || onClick);

  const body = (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="font-medium leading-snug break-words">{title}</div>
        {subtitle ? (
          <div className="text-sm text-muted-foreground break-words">
            {subtitle}
          </div>
        ) : null}
      </div>
      {trailing ? (
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {trailing}
        </div>
      ) : null}
      {interactive ? (
        <ChevronRight
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );

  const content = (
    <>
      {body}
      {children ? <dl className="mt-3 space-y-1.5">{children}</dl> : null}
      {actions ? (
        <div className="mt-3 flex flex-wrap gap-2 [&>*]:flex-1">{actions}</div>
      ) : null}
    </>
  );

  return (
    <li className={cn("bg-card", className)}>
      {href ? (
        <Link href={href} className="block px-4 py-4 active:bg-muted/60">
          {content}
        </Link>
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="block w-full px-4 py-4 text-left active:bg-muted/60"
        >
          {content}
        </button>
      ) : (
        <div className="px-4 py-4">{content}</div>
      )}
    </li>
  );
}

/** A label/value row inside a `DataListItem`. Long values wrap rather than clip. */
export function DataListField({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 text-sm", className)}
    >
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{children}</dd>
    </div>
  );
}

/**
 * Shared empty/error/loading frame so every list and table agrees on how a
 * failure looks. Pages must keep showing a real message instead of an empty
 * card that reads as "no data".
 */
export function DataState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-6 py-12 text-center text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
