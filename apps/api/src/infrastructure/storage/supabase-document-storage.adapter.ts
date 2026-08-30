import { randomUUID } from 'node:crypto';
import type {
  DocumentStorage,
  UploadTicket,
} from '@/application/ports/storage/document-storage.port.ts';

const BUCKET = 'application-documents';
const UPLOAD_TTL_SECONDS = 300;
const READ_TTL_SECONDS = 120;

/**
 * Supabase Storage, private bucket, signed URLs.
 *
 * Uses the **service key**, and this is the one place that is correct: signing
 * a URL is a privileged operation the client must never be able to perform for
 * itself. The key never leaves the server and never reaches the domain — it is
 * held behind this adapter, exactly as ADR-0008 holds a payment provider.
 *
 * Bucket policy is the backstop: even with a leaked path, an unsigned request
 * gets nothing.
 */
export function supabaseDocumentStorage(
  supabaseUrl = process.env.SUPABASE_URL ?? '',
  serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '',
): DocumentStorage {
  const base = supabaseUrl.replace(/\/$/, '');

  const call = async (path: string, body: unknown) => {
    if (!base || !serviceKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY are required to sign document URLs',
      );
    }

    const response = await fetch(`${base}/storage/v1${path}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `Storage refused the request (${response.status}): ${await response.text()}`,
      );
    }
    return (await response.json()) as Record<string, unknown>;
  };

  return {
    async createUploadTicket({ organizationId, applicationId, fileName }): Promise<UploadTicket> {
      // The path carries the organization and application, so a stray object
      // can always be traced back to what it belongs to. The random segment
      // means knowing someone's application id does not let you guess the path
      // of their ID photograph.
      const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
      const storagePath = `${organizationId}/${applicationId}/${randomUUID()}-${safeName}`;

      const result = await call(`/object/upload/sign/${BUCKET}/${storagePath}`, {
        expiresIn: UPLOAD_TTL_SECONDS,
      });

      return {
        storagePath,
        uploadUrl: `${base}/storage/v1${String(result.url ?? '')}`,
        expiresInSeconds: UPLOAD_TTL_SECONDS,
      };
    },

    async createReadUrl(storagePath) {
      const result = await call(`/object/sign/${BUCKET}/${storagePath}`, {
        expiresIn: READ_TTL_SECONDS,
      });
      return `${base}/storage/v1${String(result.signedURL ?? '')}`;
    },
  };
}
