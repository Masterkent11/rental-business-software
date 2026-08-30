export interface UploadTicket {
  readonly storagePath: string;
  readonly uploadUrl: string;
  readonly expiresInSeconds: number;
}

export interface DocumentStorage {
  createUploadTicket(input: {
    organizationId: string;
    applicationId: string;
    fileName: string;
  }): Promise<UploadTicket>;

  createReadUrl(storagePath: string): Promise<string>;
}

export const ALLOWED_DOCUMENT_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/pdf',
]);

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
