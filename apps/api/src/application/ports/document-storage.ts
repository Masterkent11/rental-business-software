/**
 * Private document storage.
 *
 * These are Philippine government IDs and payslips. They live in a private
 * bucket and are reachable only through short-lived signed URLs the API issues
 * (ADR-0009) — never a public path, never a guessable one.
 *
 * The API deliberately does not proxy the bytes: a signed URL lets the client
 * talk to storage directly, so a large upload on a slow connection does not
 * occupy an API worker for its duration.
 */
export interface UploadTicket {
  /** Where the object will live. Recorded against the application. */
  readonly storagePath: string;
  /** Short-lived, single-purpose upload URL. */
  readonly uploadUrl: string;
  readonly expiresInSeconds: number;
}

export interface DocumentStorage {
  /** A URL the client may PUT one file to. */
  createUploadTicket(input: {
    organizationId: string;
    applicationId: string;
    fileName: string;
  }): Promise<UploadTicket>;

  /** A URL to read one stored object, valid for minutes rather than forever. */
  createReadUrl(storagePath: string): Promise<string>;
}

/** What the platform will accept as evidence. */
export const ALLOWED_DOCUMENT_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/pdf',
]);

/**
 * Ten megabytes.
 *
 * Generous for a photographed ID and mean enough that a mistake — a video, a
 * whole scan folder — fails at the door rather than in storage.
 */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
