export interface StoredListingMedia {
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface ListingMediaStorage {
  publicUrl(storagePath: string): string;
  inspect(storagePath: string): Promise<StoredListingMedia | null>;
}
