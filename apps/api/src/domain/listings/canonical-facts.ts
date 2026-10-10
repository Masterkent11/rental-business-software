export const CANONICAL_LISTING_FACTS = ['bedrooms', 'bathrooms', 'floorAreaSqm', 'lotAreaSqm', 'parkingSlots'] as const;
export const CANONICAL_PROPERTY_FACTS = ['propertyType', 'addressLine', 'areaLabel', 'cityLabel', 'location'] as const;

export type ChangeProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CanonicalChanges {
  readonly listing: Readonly<Record<string, unknown>>;
  readonly property: Readonly<Record<string, unknown>>;
}

export interface ListingChangeProposal {
  readonly id: string;
  readonly organizationId: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly proposedByAgentId: string;
  readonly agentName: string;
  readonly changes: CanonicalChanges;
  readonly status: ChangeProposalStatus;
  readonly createdAt: Date;
  readonly decidedAt: Date | null;
}

const pick = <T extends object>(
  source: T,
  keys: readonly string[],
  keep: boolean,
): Partial<T> =>
  Object.fromEntries(
    Object.entries(source).filter(([key, value]) => value !== undefined && keys.includes(key) === keep),
  ) as Partial<T>;

export function splitCanonicalChanges<L extends object, P extends object>(
  listing: L,
  property: P | undefined,
): {
  readonly direct: { readonly listing: Partial<L>; readonly property: Partial<P> | undefined };
  readonly canonical: CanonicalChanges | null;
} {
  const canonicalListing = pick(listing, CANONICAL_LISTING_FACTS, true);
  const canonicalProperty = property ? pick(property, CANONICAL_PROPERTY_FACTS, true) : {};
  const directProperty = property ? pick(property, CANONICAL_PROPERTY_FACTS, false) : undefined;
  const hasCanonical = Object.keys(canonicalListing).length > 0 || Object.keys(canonicalProperty).length > 0;
  return {
    direct: {
      listing: pick(listing, CANONICAL_LISTING_FACTS, false),
      property: directProperty && Object.keys(directProperty).length > 0 ? directProperty : undefined,
    },
    canonical: hasCanonical
      ? {
          listing: canonicalListing as Readonly<Record<string, unknown>>,
          property: canonicalProperty as Readonly<Record<string, unknown>>,
        }
      : null,
  };
}
