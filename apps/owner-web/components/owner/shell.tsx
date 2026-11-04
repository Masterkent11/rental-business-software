"use client";

import "@/components/agent/dashboard.css";
import { PartnerEntry } from "@/components/auth/partner-entry";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useSessionStore } from "@/stores/use-session-store";
import { useMessagesStore } from "@/stores/use-messages-store";
import { useNotificationsStore } from "@/stores/use-notifications-store";
import { useEngagementStore } from "@/stores/use-engagement-store";
import { cn } from "@/lib/utils";
import {
  isActivePath,
  navigationFor,
  mobileNavigationFor,
} from "@/domain/workspace/navigation";
import {
  pathBelongsTo,
  workspaceHome,
  type Workspace,
} from "@/domain/workspace/workspace";
import { useAnalyticsStore } from "@/stores/use-analytics-store";
import { useBookingsStore } from "@/stores/use-bookings-store";
import { useListingsStore } from "@/stores/use-listings-store";
import { useDashboardStore } from "@/stores/use-dashboard-store";
import { FloatingNavigation } from "./floating-navigation";
import { PartnerIdentity } from "./partner-identity";
import { PartnerBrand, PartnerBrandingProvider } from "./partner-branding";
import { SearchResultFocus } from "./search-result-focus";
import { PartnerToolbar } from "./partner-toolbar";
import "./partner-shell.css";
import "./partner-mobile-pages.css";
import { DashboardIcon } from "./dashboard-icon";
import { BrandMark } from "./brand";
import { SignIn } from "./sign-in";
import { Btn, ErrorState } from "./ui";

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function useBadgeCounts(workspace: Workspace) {
  const messageScope = useMessagesStore((s) => s.scope);
  const engagementScope = useEngagementStore((s) => s.scope);
  const matches = (scope: typeof messageScope) =>
    workspace.kind === "OWNER"
      ? scope?.kind === "OWNER" &&
        scope.organizationId === workspace.organizationId
      : scope?.kind === "AGENT" && scope.agentId === workspace.agentId;
  const messages = useMessagesStore((s) => s.unreadTotal);
  const inquiries = useEngagementStore(
    (s) => s.inquiries.filter((i) => i.status === "NEW").length,
  );
  const viewings = useEngagementStore(
    (s) => s.viewings.filter((v) => v.status === "REQUESTED").length,
  );
  return {
    messages: matches(messageScope) ? messages : 0,
    inquiries: matches(engagementScope) ? inquiries : 0,
    viewings: matches(engagementScope) ? viewings : 0,
  };
}

function NavLinks({
  workspace,
  onNavigate,
}: {
  workspace: Workspace;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const counts = useBadgeCounts(workspace);
  return (
    <nav aria-label="Main" className="owner-navigation">
      {navigationFor(workspace).map(({ href, label, icon, badge, section }) => {
        const active = isActivePath(pathname, href);
        const count = badge ? counts[badge] : 0;
        return (
          <React.Fragment key={href}>
            {section ? (
              <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
                {section}
              </p>
            ) : null}
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focusable group flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-surface-secondary text-foreground"
                  : "text-muted hover:bg-surface-secondary/70 hover:text-foreground",
              )}
            >
              <DashboardIcon
                name={icon}
                portal={workspace.kind}
                className="size-6 shrink-0"
              />
              <span className="flex-1">{label}</span>
              {count > 0 ? (
                <span
                  className="tabular rounded-full bg-foreground px-1.5 py-0.5 text-[11px] font-semibold text-white"
                  aria-label={`${count} need attention`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function NotificationsButton() {
  const router = useRouter();
  const { items, unreadCount, open, setOpen, markAllRead } =
    useNotificationsStore();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) void markAllRead();
        }}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        className="focusable relative flex size-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        <Bell className="size-[18px]" aria-hidden />
        {unreadCount > 0 ? (
          <span className="partner-unread-count" aria-hidden>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="region"
          aria-label="Notifications"
          className="partner-notification-panel absolute right-0 top-12 z-40 w-[340px] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[13.5px] font-semibold">Notifications</p>
            <button
              className="focusable rounded-lg p-1 text-muted hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted">
                New bookings and messages will show up here.
              </p>
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
                  <span className="text-[13px] font-semibold text-foreground">
                    {n.title}
                  </span>
                  <span className="line-clamp-2 text-[12.5px] text-muted">
                    {n.body}
                  </span>
                  <span className="text-[11.5px] text-muted/80">
                    {timeAgo(n.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LiveSubscriptions({ workspace }: { workspace: Workspace }) {
  const pathname = usePathname();
  const router = useRouter();
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
  const messagesPath =
    workspace.kind === "AGENT" ? "/agent/messages" : "/messages";

  React.useEffect(() => {
    const scope = useSessionStore.getState().scope;
    if (!scope || !userId) return;
    void startMessages(scope);
    void startNotifications(scope, userId);
    void startEngagement(scope);
    return () => {
      stopMessages();
      stopNotifications();
      stopEngagement();
      useDashboardStore.getState().reset();
      useAnalyticsStore.getState().reset();
      useBookingsStore.getState().reset();
      useListingsStore.getState().reset();
    };
  }, [
    workspace.key,
    userId,
    startMessages,
    stopMessages,
    startNotifications,
    stopNotifications,
    startEngagement,
    stopEngagement,
  ]);

  React.useEffect(() => {
    if (!lastIncoming || seen.current === lastIncoming.id) return;
    seen.current = lastIncoming.id;
    if (pathname.startsWith(messagesPath)) return;
    const conversation = conversations.find(
      (c) => c.id === lastIncoming.conversationId,
    );
    toast(
      `New message${conversation ? ` from ${conversation.customerName}` : ""}`,
      {
        description: lastIncoming.body.slice(0, 120),
        action: {
          label: "Open",
          onClick: () =>
            router.push(`${messagesPath}?c=${lastIncoming.conversationId}`),
        },
      },
    );
  }, [lastIncoming, pathname, conversations, router, messagesPath]);

  React.useEffect(() => {
    if (!latest || seenNotification.current === latest.id) return;
    seenNotification.current = latest.id;
    if (latest.kind === "MESSAGE_RECEIVED") return;
    toast(latest.title, {
      description: latest.body,
      ...(latest.link
        ? {
            action: { label: "View", onClick: () => router.push(latest.link!) },
          }
        : {}),
    });
  }, [latest, router]);

  return null;
}

function RouteGuard({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = pathBelongsTo(pathname, workspace);

  React.useEffect(() => {
    if (!allowed) router.replace(workspaceHome(workspace));
  }, [allowed, router, workspace]);

  if (!allowed) {
    return (
      <div
        className="flex flex-1 items-center justify-center p-10"
        aria-busy="true"
      >
        <p className="text-[13px] text-muted">
          Opening your {workspace.kind === "AGENT" ? "agent" : "owner"}{" "}
          workspace…
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function WorkspaceChooser() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    workspaces,
    setWorkspace,
    signOut,
    workspaceBusy,
    workspaceError,
  } = useSessionStore();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="size-10" />
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">
              Choose a workspace
            </h1>
            <p className="text-[13px] text-muted">
              Signed in as {user?.email}. You can switch any time from the
              sidebar.
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {workspaces.map((w) => (
            <li key={w.key}>
              <button
                type="button"
                disabled={workspaceBusy}
                onClick={async () => {
                  if (await setWorkspace(w.key)) {
                    if (!pathBelongsTo(pathname, w))
                      router.push(workspaceHome(w));
                  }
                }}
                className="focusable flex w-full items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-4 text-left transition-colors hover:border-foreground/25"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-muted">
                  {w.kind === "AGENT" ? (
                    <BriefcaseBusiness className="size-5" aria-hidden />
                  ) : (
                    <Building2 className="size-5" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold">
                    {w.title}
                  </p>
                  <p className="text-[12.5px] text-muted">{w.subtitle}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {workspaceError ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {workspaceError}
          </p>
        ) : null}
        <Btn variant="ghost" className="mt-6" onClick={() => void signOut()}>
          <LogOut className="size-4" aria-hidden /> Sign out
        </Btn>
      </div>
    </div>
  );
}

function NoWorkspace() {
  return <PartnerEntry setup />;
}

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    status,
    user,
    error,
    workspaces,
    activeWorkspace,
    initialize,
    watchIdentity,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    signOut,
  } = useSessionStore();

  React.useEffect(() => {
    const stop = watchIdentity();
    void initialize();
    return stop;
  }, [initialize, watchIdentity]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    const refresh = () => {
      if (document.visibilityState === "visible")
        void useSessionStore
          .getState()
          .reload()
          .catch(() => undefined);
    };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [status]);

  React.useEffect(() => {
    if (!mobileDrawerOpen) return;
    const drawer = document.querySelector<HTMLElement>(".owner-drawer");
    const focusable = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>("a[href], button, select") ?? [],
      );
    const previous = document.activeElement as HTMLElement | null;
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [mobileDrawerOpen, setMobileDrawerOpen]);

  if (status === "loading") {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background"
        aria-busy="true"
      >
        <BrandMark className="size-12 animate-pulse" />
        <p className="text-[13px] text-muted">Restoring your session…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <ErrorState
          message={error ?? "We couldn't reach the server."}
          onRetry={() => void initialize()}
        />
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return <SignIn />;
  }

  if (workspaces.length === 0) return <NoWorkspace />;
  if (!activeWorkspace) return <WorkspaceChooser />;
  const workspace = activeWorkspace;
  const owner = workspace.kind === "OWNER";
  const sidebar = (
    <div className="owner-sidebar-content">
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <NavLinks
          workspace={workspace}
          onNavigate={() => setMobileDrawerOpen(false)}
        />
      </div>
      <Btn
        variant="ghost"
        className="w-full justify-start gap-3"
        onClick={() => void signOut()}
      >
        <LogOut className="size-5" aria-hidden /> Sign out
      </Btn>
    </div>
  );

  const toolbar = (
    <PartnerToolbar
      workspace={workspace}
      notifications={<NotificationsButton />}
      identity={
        <PartnerIdentity
          user={user}
          workspace={workspace}
          onSignOut={() => void signOut()}
        />
      }
      navigation={
        <button
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Open navigation"
          className="partner-navigation focusable"
        >
          <Menu size={20} aria-hidden />
        </button>
      }
    />
  );

  return (
    <PartnerBrandingProvider
      key={`${user.id}:${workspace.key}`}
      workspace={workspace}
    >
      <div
        className={cn(
          "flex min-h-dvh flex-col bg-background text-foreground",
          "owner-workspace",
          !owner && "agent-workspace",
        )}
      >
        <LiveSubscriptions workspace={workspace} />
        {toolbar}
        <div className="flex min-w-0 flex-1">
          <aside
            className={cn(
              "sticky hidden shrink-0 border-r border-border bg-background lg:block",
              "owner-sidebar",
            )}
          >
            {sidebar}
          </aside>
          {mobileDrawerOpen ? (
            <div
              className="fixed inset-0 z-40 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div
                className="absolute inset-0 bg-black/30"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <div className="owner-drawer absolute inset-y-0 left-0 w-[280px] bg-background shadow-2xl">
                <div className="partner-drawer-heading">
                  <PartnerBrand workspace={workspace} drawer onNavigate={() => setMobileDrawerOpen(false)} />
                  <button
                    type="button"
                    className="focusable grid size-11 place-items-center rounded-xl"
                    aria-label="Close navigation"
                    onClick={() => setMobileDrawerOpen(false)}
                  >
                    <X size={20} aria-hidden />
                  </button>
                </div>
                {sidebar}
              </div>
            </div>
          ) : null}
          <div className="partner-content flex min-w-0 flex-1 flex-col">
            <SearchResultFocus />
            <RouteGuard workspace={workspace}>{children}</RouteGuard>
          </div>
        </div>
        <FloatingNavigation
          items={mobileNavigationFor(workspace)}
          pathname={pathname}
          portal={workspace.kind}
          expanded={mobileDrawerOpen}
          onMore={() => setMobileDrawerOpen(true)}
        />
      </div>
    </PartnerBrandingProvider>
  );
}

export function Page({
  children,
  wide = false,
  className,
}: {
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "partner-page mx-auto w-full flex-1 px-4 pb-16 pt-6 md:px-8",
        wide ? "max-w-[1400px]" : "max-w-6xl",
        className,
      )}
    >
      {children}
    </main>
  );
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
    <header className="partner-page-heading mb-6 flex flex-wrap items-end justify-between gap-4 pr-0 lg:pr-14">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {caption ? (
          <p className="mt-1 text-[13.5px] text-muted">{caption}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
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
        {caption ? (
          <p className="mt-0.5 text-[12.5px] text-muted">{caption}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : null}
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
