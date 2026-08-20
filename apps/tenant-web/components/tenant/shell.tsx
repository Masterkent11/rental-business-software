"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Home,
  ReceiptText,
  ScrollText,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lease, outstandingCentavos, propertyPhotoAlt } from "@/lib/fixtures";
import { peso } from "@/lib/money";
import { Photo } from "./photo";

const nav = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/payments", label: "Payments", icon: FileText },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/lease", label: "Lease", icon: ScrollText },
] as const;

/**
 * The tenant frame.
 *
 * The rail leads with a photograph of the tenant's own place, because the
 * customer app is photography-led and this is the same product — a text-only
 * nav column is what makes a portal feel like an admin panel.
 *
 * Desktop gets the rail; mobile gets a frosted bottom bar. Tenant mobile is the
 * primary surface in the journey, so neither is the afterthought.
 */
export function TenantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh">
      <aside className="border-border sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r md:flex">
        <div className="p-4">
          <Link
            href="/lease"
            className="group relative block h-[132px] overflow-hidden rounded-[18px]"
          >
            <Photo
              src={propertyPhotoAlt}
              alt={`${lease.resourceLabel}, ${lease.propertyName}`}
              className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="268px"
              priority
            />
            <div className="scrim-card absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 p-3.5">
              <p className="label-caps text-white/70">Renting</p>
              <p className="mt-0.5 text-[17px] leading-tight font-semibold text-white">
                {lease.resourceLabel}
              </p>
              <p className="truncate text-[13px] text-white/75">
                {lease.propertyName}
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[14.5px] transition-colors",
                  active
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground font-medium",
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px] shrink-0",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.2 : 1.9}
                />
                {label}
                {href === "/invoices" && outstandingCentavos > 0 ? (
                  <span className="text-money ml-auto text-[12.5px] font-semibold tabular-nums">
                    {peso(outstandingCentavos)}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-border m-3 rounded-[14px] border p-3.5">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            You rent from{" "}
            <span className="text-foreground font-medium">
              {lease.organizationName}
            </span>{" "}
            — and you are still a customer everywhere else. One account, both at
            once.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        <nav className="border-border bg-background/80 fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t backdrop-blur-xl md:hidden">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-[21px]" strokeWidth={active ? 2.3 : 1.9} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/** Page container. Wider than a form column — this is a dashboard. */
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 py-7 sm:px-8">
      {children}
    </div>
  );
}

/**
 * Sticky top bar.
 *
 * The thing that most separates a web application from a long document: chrome
 * that stays put while the content scrolls, holding the title and the actions
 * that belong to this view.
 */
export function TopBar({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1320px] items-center gap-4 px-5 py-4 sm:px-8">
        <div className="min-w-0">
          <h1 className="text-[19px] leading-tight font-semibold tracking-[-0.02em]">
            {title}
          </h1>
          {caption ? (
            <p className="text-muted-foreground mt-0.5 truncate text-[13px]">
              {caption}
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>
      </div>
    </header>
  );
}

export function PageHeader({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-display">{title}</h1>
        {caption ? (
          <p className="text-muted-foreground mt-1.5 text-[15px]">{caption}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Section heading inside a page. Stacked, never sharing a line. */
export function SectionHeading({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-title">{title}</h2>
        {caption ? (
          <p className="text-muted-foreground mt-1 text-[13.5px]">{caption}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** The one surface style. Borders do the structure; shadow only lifts. */
export function Panel({
  children,
  className,
  tone = "plain",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "plain" | "money" | "bad" | "pending";
}) {
  const tones = {
    plain: "bg-card border-border",
    money: "bg-money-soft border-money/20",
    bad: "bg-bad-soft border-bad/20",
    pending: "bg-pending-soft border-pending/25",
  } as const;

  return (
    <div
      className={cn(
        "rounded-[22px] border",
        tone === "plain" && "lift",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
