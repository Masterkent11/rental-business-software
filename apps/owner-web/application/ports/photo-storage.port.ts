export interface UploadedPhoto {
  readonly storagePath: string;
}

export interface PhotoStoragePort {
  upload(
    organizationId: string,
    listingId: string,
    file: File,
    onProgress: (fraction: number) => void,
  ): Promise<UploadedPhoto>;
  remove(storagePath: string): Promise<void>;
}
