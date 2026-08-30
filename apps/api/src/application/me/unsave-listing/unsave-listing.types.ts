export interface UnsaveListingInput {
  readonly userId: string;
  readonly listingId: string;
}

export type UnsaveListingResult = readonly string[];
