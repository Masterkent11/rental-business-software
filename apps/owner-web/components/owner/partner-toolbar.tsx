"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Workspace } from "@/domain/workspace/workspace";
import { workspaceHome } from "@/domain/workspace/workspace";
import { BrandMark } from "./brand";
import { PartnerSearchControl } from "./partner-search-control";

export function PartnerToolbar({
  workspace,
  notifications,
  navigation,
  identity,
}: {
  workspace: Workspace;
  notifications: ReactNode;
  navigation?: ReactNode;
  identity: ReactNode;
}) {
  const title =
    workspace.kind === "AGENT" ? `Agent · ${workspace.title}` : workspace.title;
  return (
    <header className="partner-toolbar" aria-label="Partner Portal header">
      {navigation}
      <Link
        href={workspaceHome(workspace)}
        className="partner-brand focusable"
        aria-label="Partner Portal home"
      >
        <BrandMark className="size-[54px]" />
        <span>
          <span className="partner-wordmark">WeStayPlace</span>
          <span className="partner-brand-subtitle">Partner Portal</span>
        </span>
      </Link>
      <p className="partner-workspace-name" title={title}>
        {title}
      </p>
      <PartnerSearchControl workspace={workspace} />
      <div className="partner-header-actions">
        <div className="partner-notifications">{notifications}</div>
        {identity}
      </div>
    </header>
  );
}
