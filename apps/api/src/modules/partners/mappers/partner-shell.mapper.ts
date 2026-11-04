import type {
  PartnerBranding,
  PartnerSearchResult,
} from "@/domain/partners/partner-shell.ts";
export const brandingResponse = (branding: PartnerBranding) => ({
  logo: branding.logo,
  canEdit: branding.canEdit,
});
export const searchResponse = (result: {
  items: readonly PartnerSearchResult[];
}) => ({
  items: result.items.map(({ id, kind, title, subtitle }) => ({
    id,
    kind,
    title,
    subtitle,
  })),
});
