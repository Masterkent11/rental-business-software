"use client";

import Link from "next/link";
import { isActivePath, type NavItem } from "@/domain/workspace/navigation";
import { DashboardIcon } from "./dashboard-icon";

export function FloatingNavigation({
  items,
  pathname,
  portal,
  expanded,
  onMore,
}: {
  items: readonly NavItem[];
  pathname: string;
  portal: "OWNER" | "AGENT";
  expanded: boolean;
  onMore: () => void;
}) {
  const moreActive = !items.some((item) => isActivePath(pathname, item.href));
  return (
    <nav className="partner-mobile-dock" aria-label="Quick navigation">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-label={item.label}
          title={item.label}
          aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
          onClick={(event) => {
            if (pathname === item.href && !event.metaKey && !event.ctrlKey)
              event.preventDefault();
          }}
          className="partner-dock-item focusable"
        >
          <DashboardIcon
            name={item.icon}
            portal={portal}
            className="partner-dock-icon"
          />
        </Link>
      ))}
      <button
        type="button"
        className="partner-dock-item focusable"
        aria-label="More navigation"
        title="More"
        aria-current={moreActive ? "page" : undefined}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        onClick={onMore}
      >
        <DashboardIcon name="more" className="partner-dock-icon" />
      </button>
    </nav>
  );
}
