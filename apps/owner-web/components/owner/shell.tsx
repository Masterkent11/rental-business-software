"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Building2,
  ChevronsUpDown,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  Rotate3d,
  Search,
  Wallet,
  Wrench,
} from "lucide-react";
import { Avatar, Card, Chip, Drawer, Kbd, Separator } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { VariantProps } from "tailwind-variants";

import { cn } from "@/lib/utils";
import {
  organization,
  pendingApplications,
  unacknowledged,
} from "@/lib/fixtures";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  {
    href: "/applications",
    label: "Applications",
    icon: ClipboardList,
    badge: pendingApplications.length,
  },
  { href: "/payments", label: "Payments", icon: Wallet },
  {
    href: "/maintenance",
    label: "Maintenance",
    icon: Wrench,
    badge: unacknowledged.length,
  },
  { href: "/listings", label: "Listings", icon: Megaphone },
  { href: "/tours", label: "Virtual tours", icon: Rotate3d },
] as const;

type NavItem = (typeof nav)[number];

/**
 * What fits across the bottom of a phone.
 *
 * Four plus a way to reach the rest. Seven tap targets on a 360px screen are
 * each too small to hit and too crowded to read, and the owner's day starts
 * with money and the people waiting on a decision — so those come first and
 * the operational pages sit one tap behind.
 */
const primaryCount = 4;
const barItems = nav.slice(0, primaryCount);
const overflowItems = nav.slice(primaryCount);

const badgeOf = (item: NavItem) => ("badge" in item ? item.badge : undefined);

/** A count that must not be missed, wherever it appears. */
function NavBadge({ count }: { count: number }) {
  return (
    <Chip color="danger" size="sm" className="ml-auto">
      {count}
    </Chip>
  );
}

/**
 * The owner frame.
 *
 * A quiet rail beside the work. Everything visible here — surfaces, borders,
 * focus rings, the accent on the active row — comes from HeroUI's theme rather
 * than from hexes chosen per screen, so the chrome and the content inside it
 * are demonstrably the same palette.
 */
export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh">
      <aside className="bg-surface border-border sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r md:flex">
        <button className="hover:bg-surface-secondary m-3 flex items-center gap-2.5 rounded-[14px] px-2.5 py-2.5 text-left transition-colors">
          <Avatar size="sm" className="shrink-0">
            <Avatar.Fallback>SP</Avatar.Fallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold">
              {organization.name}
            </span>
            <span className="text-muted-foreground block text-[11.5px]">
              {organization.verified ? "Verified" : "Unverified"}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
        </button>

        <div className="px-3 pb-2">
          <div className="bg-surface-secondary text-muted-foreground flex items-center gap-2 rounded-[11px] px-2.5 py-2 text-[13px]">
            <Search className="size-3.5" />
            Search
            <Kbd className="ml-auto">⌘K</Kbd>
          </div>
        </div>

        <nav className="mt-1 flex-1 space-y-0.5 px-3">
          {nav.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isActive(href);
            const badge = badgeOf(item);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[13.5px] transition-colors",
                  active
                    ? "bg-accent-soft text-accent-soft-foreground font-semibold"
                    : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground font-medium",
                )}
              >
                <Icon
                  className="size-[17px] shrink-0"
                  strokeWidth={active ? 2.2 : 1.9}
                />
                {label}
                {badge ? <NavBadge count={badge} /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-border border-t p-3">
          <div className="flex items-center gap-2.5 px-1.5 py-1">
            <Avatar size="sm" className="shrink-0">
              <Avatar.Fallback>RS</Avatar.Fallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium">
                Ramon Santos
              </span>
              <span className="text-muted-foreground block text-[11px]">
                Owner
              </span>
            </span>
          </div>
        </div>
      </aside>

      {/* Room for the bottom bar, so the last row of a table is never sitting
          underneath it. */}
      <div className="flex min-w-0 flex-1 flex-col pb-[68px] md:pb-0">
        {children}
      </div>

      <MobileBar isActive={isActive} />
    </div>
  );
}

/**
 * Navigation below the rail's breakpoint.
 *
 * Owner web is the primary management surface, and an owner checking who owes
 * them money does it standing in a corridor as often as at a desk. Without
 * this the page below `md` had no navigation at all — every route was a
 * dead end you could only leave with the browser's back button.
 */
function MobileBar({ isActive }: { isActive: (href: string) => boolean }) {
  const [open, setOpen] = React.useState(false);

  const overflowBadge = overflowItems.reduce(
    (total, item) => total + (badgeOf(item) ?? 0),
    0,
  );
  const overflowActive = overflowItems.some((item) => isActive(item.href));

  return (
    <>
      <nav className="bg-surface/95 border-border fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t backdrop-blur-xl md:hidden">
        {barItems.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(href);
          const badge = badgeOf(item);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10.5px] transition-colors",
                active
                  ? "text-accent font-semibold"
                  : "text-muted-foreground font-medium",
              )}
            >
              <span className="relative">
                <Icon
                  className="size-[19px]"
                  strokeWidth={active ? 2.2 : 1.9}
                />
                {badge ? <BarDot count={badge} /> : null}
              </span>
              {label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="More sections"
          className={cn(
            "flex flex-col items-center gap-1 py-2.5 text-[10.5px] transition-colors",
            overflowActive
              ? "text-accent font-semibold"
              : "text-muted-foreground font-medium",
          )}
        >
          <span className="relative">
            <MoreHorizontal
              className="size-[19px]"
              strokeWidth={overflowActive ? 2.2 : 1.9}
            />
            {/* The count lives on a page you cannot see from here, so the bar
                carries it rather than letting it go quiet behind "More". */}
            {overflowBadge ? <BarDot count={overflowBadge} /> : null}
          </span>
          More
        </button>
      </nav>

      <Drawer isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Header>
              <Drawer.Heading>{organization.name}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="pb-2">
              {overflowItems.map((item) => {
                const { href, label, icon: Icon } = item;
                const active = isActive(href);
                const badge = badgeOf(item);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[12px] px-3 py-3 text-[14.5px] transition-colors",
                      active
                        ? "bg-accent-soft text-accent-soft-foreground font-semibold"
                        : "text-muted-foreground hover:bg-surface-secondary font-medium",
                    )}
                  >
                    <Icon
                      className="size-[18px] shrink-0"
                      strokeWidth={active ? 2.2 : 1.9}
                    />
                    {label}
                    {badge ? <NavBadge count={badge} /> : null}
                  </Link>
                );
              })}

              <Separator className="my-2" />

              <div className="flex items-center gap-2.5 px-2 pb-1">
                <Avatar size="sm" className="shrink-0">
                  <Avatar.Fallback>RS</Avatar.Fallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">
                    Ramon Santos
                  </span>
                  <span className="text-muted-foreground block text-[11px]">
                    Owner
                  </span>
                </span>
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer>
    </>
  );
}

/** The same count as [NavBadge], sized to sit on an icon. */
function BarDot({ count }: { count: number }) {
  return (
    <span className="bg-danger text-danger-foreground absolute -top-1 -right-2 grid h-[15px] min-w-[15px] place-items-center rounded-full px-1 text-[9.5px] font-semibold">
      {count}
    </span>
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
      {/* Wraps rather than collides: on a phone the title and two actions do
          not fit on one line, and a heading sliding under a button is worse
          than a heading with the buttons beneath it. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 lg:px-8">
        {/* A real minimum, not min-w-0: with nothing to stop it the title
            shrank to 44px and slid under the buttons instead of pushing them
            onto a second line. */}
        <div className="min-w-[11rem] flex-1">
          <h1 className="truncate text-[19px] leading-tight font-semibold tracking-[-0.02em]">
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

/**
 * A link that looks like a HeroUI button.
 *
 * HeroUI's `Button` is a react-aria button, and this build ships no
 * `RouterProvider` to teach it about the Next.js router — so a navigation
 * rendered as one would either reload the page or need an `onPress` handler,
 * and an `onPress` handler is not a link: no middle-click, no open-in-new-tab,
 * no prefetch. This keeps a real anchor and borrows the button's styling.
 */
export function ButtonLink({
  href,
  children,
  className,
  variant = "outline",
  size = "sm",
  fullWidth,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
} & Pick<
  VariantProps<typeof buttonVariants>,
  "variant" | "size" | "fullWidth"
>) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
    >
      {children}
    </Link>
  );
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
        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        {caption ? (
          <p className="text-muted-foreground mt-0.5 text-[12.5px]">
            {caption}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * A surface with a job.
 *
 * HeroUI's `Card` underneath, plus the four tones this product keeps saying:
 * neutral, money, something wrong, something waiting. Each tone is a semantic
 * token rather than a colour, so the palette can move — as it just did — and
 * every panel moves with it.
 *
 * Pages still being migrated to HeroUI compose with this; the dashboard uses
 * `Card` directly.
 */
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
    plain: "",
    money: "bg-money-soft border-money/25",
    bad: "bg-bad-soft border-bad/25",
    pending: "bg-pending-soft border-pending/30",
  } as const;

  return <Card className={cn(tones[tone], className)}>{children}</Card>;
}

/**
 * Somewhere for a wide table to go on a narrow screen.
 *
 * [Panel] clips to its own corners, so a table that outgrows it simply loses
 * its right-hand columns — and on the arrears table those columns are the
 * "Send reminder" button. This gives the table a scroller of its own inside
 * the panel, so nothing becomes unreachable at 390px.
 */
export function TableScroll({ children }: { children: React.ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
}
