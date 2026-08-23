import type {
  MediaStorage,
  StoredObject,
} from '../../application/ports/media-storage.ts';

const BUCKET = 'tour-media';

/**
 * Tiles are immutable once written — a scene id plus a level and a tile
 * coordinate never means two different images — so they can be cached hard.
 * The signed URL's own expiry is the shorter of the two and governs.
 */
const READ_TTL_SECONDS = 600;
const CACHE_SECONDS = 31_536_000;

/**
 * Supabase Storage, private bucket, service key.
 *
 * The service key is correct here and only here: writing a derivative and
 * signing a URL are privileged operations a client must never perform for
 * itself. It stays behind this adapter and never reaches the domain.
 */
export function supabaseMediaStorage(
  supabaseUrl = process.env.SUPABASE_URL ?? '',
  serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '',
): MediaStorage {
  const base = supabaseUrl.replace(/\/$/, '');

  const require = () => {
    if (!base || !serviceKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY are required to store tour media',
      );
    }
  };

  return {
    async put(objects: readonly StoredObject[]): Promise<void> {
      require();

      // Uploaded in small batches rather than all at once: a 32-tile level is
      // 32 requests, and firing them together against one host is how a
      // processing job becomes a thundering herd.
      const batchSize = 8;
      for (let i = 0; i < objects.length; i += batchSize) {
        const batch = objects.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (object) => {
            const response = await fetch(
              `${base}/storage/v1/object/${BUCKET}/${object.path}`,
              {
                method: 'POST',
                headers: {
                  apikey: serviceKey,
                  authorization: `Bearer ${serviceKey}`,
                  'content-type': object.contentType,
                  'cache-control': `max-age=${CACHE_SECONDS}`,
                  'x-upsert': 'true',
                },
                body: new Uint8Array(object.body),
              },
            );

            if (!response.ok) {
              throw new Error(
                `Storage refused ${object.path} (${response.status}): ${await response.text()}`,
              );
            }
          }),
        );
      }
    },

    async createReadUrl(path: string): Promise<string> {
      require();

      const response = await fetch(
        `${base}/storage/v1/object/sign/${BUCKET}/${path}`,
        {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            authorization: `Bearer ${serviceKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: READ_TTL_SECONDS }),
        },
      );

      if (!response.ok) {
        throw new Error(`Could not sign ${path} (${response.status})`);
      }

      const result = (await response.json()) as { signedURL?: string };
      return `${base}/storage/v1${result.signedURL ?? ''}`;
    },
  };
}
