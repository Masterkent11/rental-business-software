"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarClock,
  ChartColumn,
  ChevronsUpDown,
  ClipboardList,
  ContactRound,
  Inbox,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  MessageSquare,
  Rotate3d,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useSessionStore } from "@/stores/use-session-store";
import { useMessagesStore } from "@/stores/use-messages-store";
import { useNotificationsStore } from "@/stores/use-notifications-store";
import { useEngagementStore } from "@/stores/use-engagement-store";
import { cn } from "@/lib/utils";
import { isActivePath, navigationFor, type NavIcon } from "@/domain/workspace/navigation";
import { pathBelongsTo, workspaceHome, type Workspace } from "@/domain/workspace/workspace";
import { BrandMark } from "./brand";
import { SignIn } from "./sign-in";
import { AgentSetupCard } from "./agent-setup";
import { Btn, ErrorState } from "./ui";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  properties: Building2,
  bookings: CalendarCheck,
  inquiries: Inbox,
  viewings: CalendarClock,
  messages: MessageSquare,
  applications: ClipboardList,
  payments: Wallet,
  tours: Rotate3d,
  analytics: ChartColumn,
  account: UserRound,
  clients: ContactRound,
  tasks: ListTodo,
  profile: BriefcaseBusiness,
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function useBadgeCounts() {
  const messages = useMessagesStore((s) => s.unreadTotal);
  const inquiries = useEngagementStore((s) => s.inquiries.filter((i) => i.status === "NEW").length);
  const viewings = useEngagementStore((s) => s.viewings.filter((v) => v.status === "REQUESTED").length);
  return { messages, inquiries, viewings };
}

function NavLinks({ workspace, onNavigate }: { workspace: Workspace; onNavigate?: () => void }) {
  const pathname = usePathname();
  const counts = useBadgeCounts();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {navigationFor(workspace).map(({ href, label, icon, badge }) => {
        const Icon = ICONS[icon];
        const active = isActivePath(pathname, href);
        const count = badge ? counts[badge] : 0;
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
            {count > 0 ? (
              <span className="tabular rounded-full bg-foreground px-1.5 py-0.5 text-[11px] font-semibold text-white" aria-label={`${count} need attention`}>
                {count > 99 ? "99+" : count}
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

function WorkspaceSwitcher({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const { workspaces, setWorkspace } = useSessionStore();
  if (workspaces.length <= 1) {
    return (
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold text-foreground">{workspace.title}</p>
        <p className="text-[11.5px] text-muted">{workspace.subtitle}{workspace.kind === "OWNER" && !workspace.verified ? " · not verified" : ""}</p>
      </div>
    );
  }
  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">Workspace</span>
      <select
        value={workspace.key}
        onChange={(event) => {
          const next = workspaces.find((w) => w.key === event.target.value);
          if (!next) return;
          setWorkspace(next.key);
          router.push(workspaceHome(next));
        }}
        className="focusable w-full appearance-none truncate rounded-lg bg-transparent pr-6 text-[13.5px] font-semibold text-foreground"
      >
        {workspaces.map((w) => (
          <option key={w.key} value={w.key}>
            {w.kind === "AGENT" ? `Agent · ${w.title}` : `Owner · ${w.title}`}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <span className="block text-[11.5px] text-muted">{workspace.subtitle}</span>
    </label>
  );
}

function LiveSubscriptions({ workspace }: { workspace: Workspace }) {
  const pathname = usePathname();
  const router = useRouter();
  const scope = useSessionStore((s) => s.scope);
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const startMessages = useMessagesStore((s) => s.start);
  const stopMessages = useMessagesStore((s) => s.stop);
  const lastIncoming = useMessagesStore((s) => s.lastIncoming);
  const conversations = useMessagesStore((s) => s.conversations);
  const startNotifications = useNotificationsStore((s) => s.start);
  const stopNotifications = useNotificationsStore((s) => s.stop);
  const startEngagement = useEngagementStore((s) => s.start);
  const stopEngagement = useEngagementStore((s) => s.stop);
  const latest = useNotificationsStore((s) => s.latest);
  const seen = React.useRef<string | null>(null);
  const seenNotification = React.useRef<string | null>(null);
  const messagesPath = workspace.kind === "AGENT" ? "/agent/messages" : "/messages";

  React.useEffect(() => {
    if (!scope || !userId) return;
    void startMessages(scope);
    void startNotifications(scope, userId);
    void startEngagement(scope);
    return () => {
      stopMessages();
      stopNotifications();
      stopEngagement();
    };
  }, [scope, userId, startMessages, stopMessages, startNotifications, stopNotifications, startEngagement, stopEngagement]);

  React.useEffect(() => {
    if (!lastIncoming || seen.current === lastIncoming.id) return;
    seen.current = lastIncoming.id;
    if (pathname.startsWith(messagesPath)) return;
    const conversation = conversations.find((c) => c.id === lastIncoming.conversationId);
    toast(`New message${conversation ? ` from ${conversation.customerName}` : ""}`, {
      description: lastIncoming.body.slice(0, 120),
      action: { label: "Open", onClick: () => router.push(`${messagesPath}?c=${lastIncoming.conversationId}`) },
    });
  }, [lastIncoming, pathname, conversations, router, messagesPath]);

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

function RouteGuard({ workspace, children }: { workspace: Workspace; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = pathBelongsTo(pathname, workspace);

  React.useEffect(() => {
    if (!allowed) router.replace(workspaceHome(workspace));
  }, [allowed, router, workspace]);

  if (!allowed) {
    return (
      <div className="flex flex-1 items-center justify-center p-10" aria-busy="true">
        <p className="text-[13px] text-muted">Opening your {workspace.kind === "AGENT" ? "agent" : "owner"} workspace…</p>
      </div>
    );
  }
  return <>{children}</>;
}

function WorkspaceChooser() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, workspaces, setWorkspace, signOut } = useSessionStore();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="size-10" />
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">Choose a workspace</h1>
            <p className="text-[13px] text-muted">Signed in as {user?.email}. You can switch any time from the sidebar.</p>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {workspaces.map((w) => (
            <li key={w.key}>
              <button
                type="button"
                onClick={() => {
                  setWorkspace(w.key);
                  if (!pathBelongsTo(pathname, w)) router.push(workspaceHome(w));
                }}
                className="focusable flex w-full items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-4 text-left transition-colors hover:border-foreground/25"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-muted">
                  {w.kind === "AGENT" ? <BriefcaseBusiness className="size-5" aria-hidden /> : <Building2 className="size-5" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold">{w.title}</p>
                  <p className="text-[12.5px] text-muted">{w.subtitle}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <Btn variant="ghost" className="mt-6" onClick={() => void signOut()}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </Btn>
      </div>
    </div>
  );
}

function NoWorkspace() {
  const { user, signOut } = useSessionStore();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="size-10" />
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">Welcome to the Partner Portal</h1>
            <p className="text-[13px] text-muted">
              {user?.email} isn&apos;t part of an owner organization yet. Ask an organization owner to add you, or set up an agent profile.
            </p>
          </div>
        </div>
        <AgentSetupCard />
        <Btn variant="ghost" className="mt-6" onClick={() => void signOut()}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </Btn>
      </div>
    </div>
  );
}

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const { status, user, error, workspaces, activeWorkspace, initialize, signOut, mobileDrawerOpen, setMobileDrawerOpen } = useSessionStore();

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

  if (workspaces.length === 0) return <NoWorkspace />;
  if (!activeWorkspace) return <WorkspaceChooser />;
  const workspace = activeWorkspace;

  const sidebar = (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link href={workspaceHome(workspace)} className="focusable flex items-center gap-2.5 rounded-xl px-1 py-1" aria-label="Partner Portal home">
        <BrandMark className="size-9" />
        <div>
          <p className="text-[14px] font-bold tracking-tight">Rental Platform</p>
          <p className="text-[11.5px] text-muted">Partner Portal</p>
        </div>
      </Link>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5">
        <WorkspaceSwitcher workspace={workspace} />
      </div>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <NavLinks workspace={workspace} onNavigate={() => setMobileDrawerOpen(false)} />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5">
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
      <LiveSubscriptions workspace={workspace} />
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
        <RouteGuard workspace={workspace}>{children}</RouteGuard>
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
