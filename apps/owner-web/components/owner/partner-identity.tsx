"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { LogOut, Settings, UserRound } from "lucide-react";
import type { UserProfile } from "@/domain/session/session";
import type { Workspace } from "@/domain/workspace/workspace";
import { PartnerVerificationBadge } from "./partner-verification";

export function PartnerIdentity({
  user,
  workspace,
  onSignOut,
}: {
  user: UserProfile;
  workspace: Workspace;
  onSignOut: () => void;
}) {
  const name = user.displayName.trim() || "Account";
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${name}`}
          className="partner-account focusable"
          title={name}
        >
          <span className="relative inline-flex shrink-0">
            <span className="partner-account-avatar" aria-hidden>
              {initials}
            </span>
            <PartnerVerificationBadge
              verified={workspace.verified}
              portal={workspace.kind}
              compact
            />
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="partner-account-menu"
          align="end"
          sideOffset={12}
          collisionPadding={12}
          aria-label="Account"
          aria-labelledby={undefined}
        >
          <DropdownMenu.Label className="partner-account-menu-label">
            <strong>{name}</strong>
            {user.email ? <span>{user.email}</span> : null}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="partner-account-menu-separator" />
          <DropdownMenu.Item asChild>
            <Link href="/account" className="partner-account-menu-item">
              <Settings size={18} aria-hidden />
              Account and settings
            </Link>
          </DropdownMenu.Item>
          {workspace.kind === "AGENT" ? (
            <DropdownMenu.Item asChild>
              <Link href="/agent/profile" className="partner-account-menu-item">
                <UserRound size={18} aria-hidden />
                Agent profile
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="partner-account-menu-separator" />
          <DropdownMenu.Item
            className="partner-account-menu-item"
            onSelect={onSignOut}
          >
            <LogOut size={18} aria-hidden />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
