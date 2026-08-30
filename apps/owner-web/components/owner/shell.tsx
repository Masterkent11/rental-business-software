"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  Rotate3d,
  Search,
  Sparkles,
  Wallet,
  Wrench,
  LogOut,
} from "lucide-react";
import {
  Avatar,
  Card,
  Chip,
  Drawer,
  Kbd,
} from "@heroui/react";

import { useSessionStore } from "@/stores/use-session-store";
import { cn } from "@/lib/utils";
import { SignIn } from "./sign-in";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/listings", label: "Marketplace Listings", icon: Megaphone },
  { href: "/tours", label: "360° Virtual Tours", icon: Rotate3d },
] as const;

const primaryCount = 4;
const barItems = nav.slice(0, primaryCount);
const overflowItems = nav.slice(primaryCount);

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const { status, user, activeOrganizationId, memberships, initialize, signOut } =
    useSessionStore();

  React.useEffect(() => {
    void initialize();
  }, [initialize]);

  const activeMembership = memberships.find((m) => m.organizationId === activeOrganizationId);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-3 border-accent border-t-transparent mb-3" />
          <p className="text-muted-foreground text-[14px] font-medium">Resolving tenant session…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <SignIn />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background text-foreground selection:bg-accent selection:text-white">
      {/* Sidebar Rail */}
      <aside className="bg-surface/80 border-border sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r backdrop-blur-2xl md:flex z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Brand Header & Organization Context */}
        <div className="p-3.5 pb-2">
          <div className="group flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface-secondary/40 p-2.5 transition-all duration-200 hover:border-accent/30 hover:bg-surface-secondary/70 hover:shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <Avatar size="md" className="ring-2 ring-accent/20 ring-offset-1 shrink-0 bg-gradient-to-br from-accent to-accent-soft text-white font-bold">
                  <Avatar.Fallback>
                    {user.displayName.slice(0, 2).toUpperCase()}
                  </Avatar.Fallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-emerald-500 shadow-xs" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold tracking-tight text-foreground">
                  {user.displayName}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Chip
                    size="sm"
                    color="success"
                    variant="soft"
                    className="h-4 text-[10px] px-1 font-semibold"
                  >
                    {activeMembership?.role ?? "OWNER"}
                  </Chip>
                </div>
              </div>
            </div>
            <button
              onClick={() => void signOut()}
              title="Sign out"
              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <div className="px-3.5 py-1.5">
          <div className="bg-surface-secondary/60 hover:bg-surface-secondary border border-border/60 hover:border-border text-muted-foreground flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] transition-all duration-150 shadow-xs">
            <Search className="size-3.5 text-muted-foreground" />
            <span>Search properties, tenants...</span>
            <Kbd className="ml-auto text-[10.5px]">⌘K</Kbd>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          <div className="px-2 py-1.5 text-[10.5px] font-bold tracking-wider uppercase text-muted-foreground/80">
            Operations
          </div>
          {nav.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200",
                  active
                    ? "bg-accent text-white font-semibold shadow-md shadow-accent/25"
                    : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105",
                    active ? "text-white" : "text-muted-foreground group-hover:text-foreground",
                  )}
                  strokeWidth={active ? 2.3 : 1.9}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Marketplace Quick Link Card */}
        <div className="p-3 pb-4">
          <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-soft/30 via-surface-secondary/50 to-surface-secondary/80 p-3.5 relative overflow-hidden">
            <div className="flex items-center gap-2 text-accent text-[12px] font-bold">
              <Sparkles className="size-3.5" />
              <span>Live Marketplace</span>
            </div>
            <p className="text-muted-foreground text-[11.5px] mt-1 leading-relaxed">
              Manage live listings, upload photos, and update pricing in real-time.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <ButtonLink
                href="/listings"
                variant="primary"
                size="sm"
                className="w-full justify-center text-[12px] h-8 rounded-lg shadow-xs font-semibold"
              >
                Manage Listings
              </ButtonLink>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col pb-[72px] md:pb-0">
        {children}
      </div>

      <MobileBar isActive={isActive} />
    </div>
  );
}

function MobileBar({ isActive }: { isActive: (href: string) => boolean }) {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useSessionStore();

  return (
    <>
      <div className="bg-surface/90 border-border fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t px-2 py-1.5 backdrop-blur-xl md:hidden shadow-lg">
        {barItems.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-accent font-bold" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </Link>
          );
        })}

        <Drawer isOpen={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <Drawer.Trigger
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors",
              mobileDrawerOpen ? "text-accent font-bold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MoreHorizontal className="size-5" />
            <span>More</span>
          </Drawer.Trigger>
          <Drawer.Content className="bg-surface/95 backdrop-blur-xl border-t border-border rounded-t-3xl p-4">
            <Drawer.Header>
              <h3 className="text-[16px] font-bold text-foreground">
                More Sections
              </h3>
            </Drawer.Header>
            <Drawer.Body className="space-y-1 py-2">
              {overflowItems.map((item) => {
                const { href, label, icon: Icon } = item;
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                      active
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer>
      </div>
    </>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>;
}

export function TopBar({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="bg-surface/60 border-border sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3.5 backdrop-blur-xl md:px-6">
      <div>
        <h1 className="text-[18px] font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {caption ? (
          <p className="text-muted-foreground text-[12.5px] mt-0.5">{caption}</p>
        ) : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </header>
  );
}

export function SectionHeading({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {caption ? (
          <p className="text-muted-foreground text-[12.5px] mt-0.5">{caption}</p>
        ) : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function TableScroll({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Panel({
  children,
  className,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "bad" | "ok" | "plain";
}) {
  return (
    <Card
      className={cn(
        "border-border/80 bg-surface/70 backdrop-blur-xl shadow-xs transition-all duration-200",
        tone === "bad" && "border-rose-500/30 bg-rose-500/5",
        tone === "ok" && "border-emerald-500/30 bg-emerald-500/5",
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function ButtonLink({
  href,
  children,
  className,
  variant = "primary",
  size = "md",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150",
        variant === "primary" &&
          "bg-accent hover:bg-accent/90 text-white shadow-xs",
        variant === "secondary" &&
          "bg-surface-secondary hover:bg-surface-secondary/80 text-foreground",
        variant === "outline" &&
          "border border-border hover:bg-surface-secondary text-foreground",
        variant === "ghost" &&
          "hover:bg-surface-secondary text-foreground",
        size === "sm" && "h-8 px-3 text-[12px] rounded-lg",
        size === "md" && "h-9 px-4 text-[13px] rounded-xl",
        size === "lg" && "h-10 px-5 text-[14px] rounded-xl",
        className,
      )}
    >
      {children}
    </Link>
  );
}
