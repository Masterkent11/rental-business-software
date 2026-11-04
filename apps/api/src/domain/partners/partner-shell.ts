export type PartnerContext =
  | {
      readonly kind: "OWNER";
      readonly userId: string;
      readonly organizationId: string;
    }
  | { readonly kind: "AGENT"; readonly userId: string };
export type PartnerSearchKind = "PROPERTY" | "INQUIRY" | "CLIENT" | "TASK";
export interface PartnerSearchResult {
  readonly id: string;
  readonly kind: PartnerSearchKind;
  readonly title: string;
  readonly subtitle: string;
}
export interface PartnerBranding {
  readonly logo: string | null;
  readonly canEdit: boolean;
}
export class PartnerInputError extends Error {}
export class PartnerUnavailableError extends Error {}
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_STORED_LOGO_BYTES = 128 * 1024;
export function normalizePartnerQuery(value: string): string {
  const query = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (query.length > 80 || query.split(" ").length > 6)
    throw new PartnerInputError("Use up to 80 characters and six words.");
  return query;
}
