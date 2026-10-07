"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Rotate3d,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useSessionStore } from "@/stores/use-session-store";
import { useMessagesStore } from "@/stores/use-messages-store";
import { useNotificationsStore } from "@/stores/use-notifications-store";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand";
import { SignIn } from "./sign-in";
import { Btn, ErrorState } from "./ui";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/tours", label: "Virtual tours", icon: Rotate3d },
  { href: "/account", label: "Account", icon: UserRound },
] as const;

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const unread = useMessagesStore((s) => s.unreadTotal);
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focusable group flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors",
              active ? "bg-surface-secondary text-foreground" : "text-muted hover:bg-surface-secondary/70 hover:text-foreground",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            <span className="flex-1">{label}</span>
            {href === "/messages" && unread > 0 ? (
              <span className="tabular rounded-full bg-foreground px-1.5 py-0.5 text-[11px] font-semibold text-white" aria-label={`${unread} unread`}>
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function NotificationsButton() {
  const router = useRouter();
  const { items, unreadCount, open, setOpen, markAllRead } = useNotificationsStore();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) void markAllRead();
        }}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        className="focusable relative flex size-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        <Bell className="size-[18px]" aria-hidden />
        {unreadCount > 0 ? <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-danger" /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 w-[340px] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[13.5px] font-semibold">Notifications</p>
            <button className="focusable rounded-lg p-1 text-muted hover:text-foreground" onClick={() => setOpen(false)} aria-label="Close notifications">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted">New bookings and messages will show up here.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    if (n.link) router.push(n.link);
                  }}
                  className="focusable flex w-full flex-col items-start gap-0.5 border-b border-border/70 px-4 py-3 text-left last:border-0 hover:bg-surface-secondary/60"
                >
                  <span className="text-[13px] font-semibold text-foreground">{n.title}</span>
                  <span className="line-clamp-2 text-[12.5px] text-muted">{n.body}</span>
                  <span className="text-[11.5px] text-muted/80">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OrganizationSwitcher() {
  const { memberships, activeOrganizationId, setActiveOrganizationId } = useSessionStore();
  const active = memberships.find((m) => m.organizationId === activeOrganizationId);
  if (memberships.length <= 1) {
    return (
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold text-foreground">{active?.organizationName ?? "Your organization"}</p>
        <p className="text-[11.5px] text-muted">{active?.role === "STAFF" ? "Staff" : "Owner"}{active && !active.verified ? " · not verified" : ""}</p>
      </div>
    );
  }
  return (
    <label className="min-w-0 flex-1">
      <span className="sr-only">Organization</span>
      <select
        value={activeOrganizationId ?? ""}
        onChange={(event) => setActiveOrganizationId(event.target.value)}
        className="focusable w-full truncate rounded-lg bg-transparent text-[13.5px] font-semibold text-foreground"
      >
        {memberships.map((m) => (
          <option key={m.organizationId} value={m.organizationId}>
            {m.organizationName}
          </option>
        ))}
      </select>
    </label>
  );
}

function LiveSubscriptions() {
  const pathname = usePathname();
  const router = useRouter();
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const startMessages = useMessagesStore((s) => s.start);
  const stopMessages = useMessagesStore((s) => s.stop);
  const lastIncoming = useMessagesStore((s) => s.lastIncoming);
  const conversations = useMessagesStore((s) => s.conversations);
  const startNotifications = useNotificationsStore((s) => s.start);
  const stopNotifications = useNotificationsStore((s) => s.stop);
  const latest = useNotificationsStore((s) => s.latest);
  const seen = React.useRef<string | null>(null);
  const seenNotification = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!organizationId) return;
    void startMessages(organizationId);
    void startNotifications(organizationId);
    return () => {
      stopMessages();
      stopNotifications();
    };
  }, [organizationId, startMessages, stopMessages, startNotifications, stopNotifications]);

  React.useEffect(() => {
    if (!lastIncoming || seen.current === lastIncoming.id) return;
    seen.current = lastIncoming.id;
    if (pathname.startsWith("/messages")) return;
    const conversation = conversations.find((c) => c.id === lastIncoming.conversationId);
    toast(`New message${conversation ? ` from ${conversation.customerName}` : ""}`, {
      description: lastIncoming.body.slice(0, 120),
      action: { label: "Open", onClick: () => router.push(`/messages?c=${lastIncoming.conversationId}`) },
    });
  }, [lastIncoming, pathname, conversations, router]);

  React.useEffect(() => {
    if (!latest || seenNotification.current === latest.id) return;
    seenNotification.current = latest.id;
    if (latest.kind === "MESSAGE_RECEIVED") return;
    toast(latest.title, {
      description: latest.body,
      ...(latest.link ? { action: { label: "View", onClick: () => router.push(latest.link!) } } : {}),
    });
  }, [latest, router]);

  return null;
}

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const { status, user, error, initialize, signOut, mobileDrawerOpen, setMobileDrawerOpen } = useSessionStore();

  React.useEffect(() => {
    void initialize();
  }, [initialize]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background" aria-busy="true">
        <BrandMark className="size-12 animate-pulse" />
        <p className="text-[13px] text-muted">Restoring your session…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <ErrorState message={error ?? "We couldn't reach the server."} onRetry={() => void initialize()} />
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return <SignIn />;
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link href="/" className="focusable flex items-center gap-2.5 rounded-xl px-1 py-1" aria-label="Rental Platform home">
        <BrandMark className="size-9" />
        <div>
          <p className="text-[14px] font-bold tracking-tight">Rental Platform</p>
          <p className="text-[11.5px] text-muted">Owner workspace</p>
        </div>
      </Link>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5">
        <OrganizationSwitcher />
      </div>
      <NavLinks onNavigate={() => setMobileDrawerOpen(false)} />
      <div className="mt-auto flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[12px] font-semibold text-white" aria-hidden>
          {user.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "O"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{user.displayName}</p>
          <p className="truncate text-[11.5px] text-muted">{user.email}</p>
        </div>
        <button
          onClick={() => void signOut()}
          aria-label="Sign out"
          className="focusable rounded-lg p-2 text-muted transition-colors hover:bg-surface-secondary hover:text-danger"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <LiveSubscriptions />
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 border-r border-border bg-background lg:block">{sidebar}</aside>
      {mobileDrawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-background shadow-2xl">{sidebar}</div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:hidden">
          <button onClick={() => setMobileDrawerOpen(true)} aria-label="Open navigation" className="focusable rounded-lg p-2">
            <Menu className="size-5" aria-hidden />
          </button>
          <BrandMark className="size-8" />
          <NotificationsButton />
        </div>
        <div className="pointer-events-none fixed right-6 top-4 z-30 hidden lg:block">
          <div className="pointer-events-auto rounded-xl bg-background/80 backdrop-blur">
            <NotificationsButton />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Page({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <main className={cn("mx-auto w-full flex-1 px-4 pb-16 pt-6 md:px-8", wide ? "max-w-[1400px]" : "max-w-6xl")}>{children}</main>;
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
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 pr-0 lg:pr-14">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">{title}</h1>
        {caption ? <p className="mt-1 text-[13.5px] text-muted">{caption}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
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
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {caption ? <p className="mt-0.5 text-[12.5px] text-muted">{caption}</p> : null}
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
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface",
        tone === "bad" && "border-danger/30 bg-danger-soft/40",
        tone === "ok" && "border-success/30 bg-success-soft/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { Btn };
