import type { Workspace } from "./workspace";

export type NavIcon =
  | "dashboard"
  | "properties"
  | "bookings"
  | "inquiries"
  | "viewings"
  | "messages"
  | "applications"
  | "payments"
  | "tours"
  | "analytics"
  | "account"
  | "clients"
  | "tasks"
  | "profile";

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: NavIcon;
  readonly badge?: "messages" | "inquiries" | "viewings";
}

const OWNER_NAV: readonly NavItem[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/properties", label: "Properties", icon: "properties" },
  { href: "/bookings", label: "Bookings", icon: "bookings" },
  { href: "/inquiries", label: "Inquiries", icon: "inquiries", badge: "inquiries" },
  { href: "/viewings", label: "Viewings", icon: "viewings", badge: "viewings" },
  { href: "/messages", label: "Messages", icon: "messages", badge: "messages" },
  { href: "/applications", label: "Applications", icon: "applications" },
  { href: "/payments", label: "Payments", icon: "payments" },
  { href: "/tours", label: "Virtual tours", icon: "tours" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/account", label: "Account", icon: "account" },
];

const AGENT_NAV: readonly NavItem[] = [
  { href: "/agent", label: "Dashboard", icon: "dashboard" },
  { href: "/agent/leads", label: "Leads", icon: "inquiries", badge: "inquiries" },
  { href: "/agent/clients", label: "Clients", icon: "clients" },
  { href: "/agent/properties", label: "Represented properties", icon: "properties" },
  { href: "/agent/viewings", label: "Viewings", icon: "viewings", badge: "viewings" },
  { href: "/agent/messages", label: "Messages", icon: "messages", badge: "messages" },
  { href: "/agent/tasks", label: "Tasks", icon: "tasks" },
  { href: "/agent/tours", label: "Virtual tours", icon: "tours" },
  { href: "/agent/analytics", label: "Analytics", icon: "analytics" },
  { href: "/agent/profile", label: "Profile", icon: "profile" },
  { href: "/account", label: "Account", icon: "account" },
];

export function navigationFor(workspace: Workspace): readonly NavItem[] {
  return workspace.kind === "AGENT" ? AGENT_NAV : OWNER_NAV;
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/" || href === "/agent") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
