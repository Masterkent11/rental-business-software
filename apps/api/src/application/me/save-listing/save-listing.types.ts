export interface SaveListingInput {
  readonly userId: string;
  readonly listingId: string;
}

export type SaveListingResult = readonly string[];
