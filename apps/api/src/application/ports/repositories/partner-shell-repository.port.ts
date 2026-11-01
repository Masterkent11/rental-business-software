import type {
  PartnerContext,
  PartnerSearchResult,
} from "@/domain/partners/partner-shell.ts";
export interface PartnerShellRepository {
  search(
    context: PartnerContext,
    query: string,
  ): Promise<readonly PartnerSearchResult[]>;
  readLogo(context: PartnerContext): Promise<string | null>;
  saveLogo(context: PartnerContext, logo: string | null): Promise<void>;
}
