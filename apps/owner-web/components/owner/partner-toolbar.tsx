"use client";

import type { ReactNode } from "react";
import type { Workspace } from "@/domain/workspace/workspace";
import { PartnerBrand } from "./partner-branding";
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
  return (
    <header className="partner-toolbar" aria-label="Partner Portal header">
      {navigation}
      <PartnerBrand workspace={workspace} />
      <PartnerSearchControl workspace={workspace} />
      <div className="partner-header-actions">
        <div className="partner-notifications">{notifications}</div>
        {identity}
      </div>
    </header>
  );
}
