"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronsUpDown,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Rotate3d,
  Search,
  Wallet,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  organization,
  pendingApplications,
  unacknowledged,
} from "@/lib/fixtures";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/applications", label: "Applications", icon: ClipboardList, badge: pendingApplications.length },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, badge: unacknowledged.length },
  { href: "/listings", label: "Listings", icon: Megaphone },
  { href: "/tours", label: "Virtual tours", icon: Rotate3d },
] as const;

/**
 * The owner frame.
 *
 * A dark rail against the warm canvas. The customer and tenant surfaces are
 * light and photography-led because they are about *places*; this one is a
 * working tool someone has open all day, and the contrast keeps the operator's
 * chrome from competing with the data inside it.
 *
 * Palette, type, and radii are otherwise identical to the other surfaces — it
 * is the same product wearing working clothes.
 */
export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh">
      <aside className="bg-[#0E0F12] sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col md:flex">
        <button className="m-3 flex items-center gap-2.5 rounded-[14px] px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.06]">
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-white/10 text-[13px] font-semibold text-white">
            SP
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-white">
              {organization.name}
            </span>
            <span className="flex items-center gap-1 text-[11.5px] text-white/45">
              {organization.verified ? "Verified" : "Unverified"}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-white/35" />
        </button>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-[11px] bg-white/[0.06] px-2.5 py-2 text-[13px] text-white/40">
            <Search className="size-3.5" />
            Search
            <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
              ⌘K
            </kbd>
          </div>
        </div>

        <nav className="mt-1 flex-1 space-y-0.5 px-3">
          {nav.map(({ href, label, icon: Icon, ...rest }) => {
            const active = isActive(href);
            const badge = "badge" in rest ? rest.badge : undefined;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[13.5px] transition-colors",
                  active
                    ? "bg-white/[0.12] font-semibold text-white"
                    : "font-medium text-white/55 hover:bg-white/[0.06] hover:text-white/90",
                )}
              >
                <Icon className="size-[17px] shrink-0" strokeWidth={active ? 2.2 : 1.9} />
                {label}
                {badge ? (
                  <span className="ml-auto grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[#B4622A] px-1.5 text-[11px] font-semibold text-white">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.08] p-3">
          <div className="flex items-center gap-2.5 px-1.5 py-1">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
              RS
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-white">
                Ramon Santos
              </span>
              <span className="block text-[11px] text-white/40">Owner</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Sticky chrome that stays put while data scrolls. */
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
      <div className="flex items-center gap-4 px-6 py-4 lg:px-8">
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

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-6 lg:px-8">{children}</div>;
}

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
    <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">{title}</h2>
        {caption ? (
          <p className="text-muted-foreground mt-0.5 text-[12.5px]">{caption}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

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
    <div className={cn("rounded-[18px] border", tone === "plain" && "lift", tones[tone], className)}>
      {children}
    </div>
  );
}
