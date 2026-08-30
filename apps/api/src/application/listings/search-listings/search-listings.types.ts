import type { Listing, ListingQuery } from '@/domain/listings/listing.ts';

export type SearchListingsInput = ListingQuery;
export type SearchListingsResult = readonly Listing[];
