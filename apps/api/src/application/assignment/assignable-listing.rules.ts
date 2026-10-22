import type { AssignableListing } from '@/application/assignment/assignment.types.ts';
import type { Listing } from '@/domain/listings/listing.ts';

export const assignableListing = (listing: Listing): AssignableListing => ({
  id: listing.id,
  organizationId: listing.organizationId,
  propertyType: listing.propertyType ?? null,
  areaLabel: listing.areaLabel,
  cityLabel: listing.cityLabel,
});

export const firstNameOf = (displayName: string | null | undefined): string => {
  const first = displayName?.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : 'Your agent';
};
