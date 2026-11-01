import type { PartnerScope } from "../../domain/workspace/workspace";
import type {
  PartnerBranding,
  PartnerSearchResult,
} from "../../domain/workspace/partner-shell";
export interface PartnerShellPort {
  search(
    scope: PartnerScope,
    query: string,
    signal: AbortSignal,
  ): Promise<readonly Omit<PartnerSearchResult, "href">[]>;
  branding(scope: PartnerScope, signal?: AbortSignal): Promise<PartnerBranding>;
  saveLogo(
    scope: PartnerScope,
    input: { data: string; contentType: string } | null,
  ): Promise<PartnerBranding>;
}
