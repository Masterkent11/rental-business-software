import type { Workspace } from "./workspace";
import { navigationFor } from "./navigation";
export interface PartnerBranding {
  readonly logo: string | null;
  readonly canEdit: boolean;
}
export interface PartnerSearchResult {
  readonly id: string;
  readonly kind: "PROPERTY" | "INQUIRY" | "CLIENT" | "TASK" | "PAGE";
  readonly title: string;
  readonly subtitle: string;
  readonly href: string;
}
export function partnerResultHref(
  workspace: Workspace,
  kind: Exclude<PartnerSearchResult["kind"], "PAGE">,
  id: string,
): string {
  const prefix = workspace.kind === "AGENT" ? "/agent" : "";
  if (kind === "PROPERTY")
    return `${prefix}/properties/${encodeURIComponent(id)}`;
  if (kind === "INQUIRY")
    return `${prefix}/${prefix ? "leads" : "inquiries"}?inquiry=${encodeURIComponent(id)}`;
  return `${prefix}/${kind === "CLIENT" ? "clients" : "tasks"}#search-${kind.toLowerCase()}-${encodeURIComponent(id)}`;
}
export function navigationMatches(
  workspace: Workspace,
  raw: string,
): PartnerSearchResult[] {
  const query = raw.trim().toLowerCase();
  if (query.length < 2) return [];
  return navigationFor(workspace)
    .filter((n) =>
      query.split(/\s+/).every((q) => n.label.toLowerCase().includes(q)),
    )
    .slice(0, 3)
    .map((n) => ({
      id: n.href,
      kind: "PAGE",
      title: n.label,
      subtitle: "Go to page",
      href: n.href,
    }));
}
