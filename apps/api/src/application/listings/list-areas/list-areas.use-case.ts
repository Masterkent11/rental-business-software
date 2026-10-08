import type {
  AreaSummary,
  ListingRepository,
} from '@/application/ports/repositories/listing-repository.port.ts';

export const listAreas =
  (listings: ListingRepository) =>
  async (): Promise<readonly AreaSummary[]> =>
    listings.areas();
