import type {
  MediaStorage,
  StoredObject,
} from '@/application/ports/storage/media-storage.port.ts';

const BUCKET = 'tour-media';

const CACHE_SECONDS = 31_536_000;

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
      if (!base) throw new Error('SUPABASE_URL is required to read tour media');
      return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
    },
  };
}
