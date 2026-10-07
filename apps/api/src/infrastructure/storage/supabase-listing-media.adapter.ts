import type {
  ListingMediaStorage,
  StoredListingMedia,
} from '@/application/ports/storage/listing-media.port.ts';

const BUCKET = 'listing-media';

export function supabaseListingMediaStorage(
  supabaseUrl = process.env.SUPABASE_URL ?? '',
  fetchImpl: typeof fetch = fetch,
): ListingMediaStorage {
  const base = supabaseUrl.replace(/\/$/, '');
  const publicUrl = (storagePath: string) =>
    `${base}/storage/v1/object/public/${BUCKET}/${storagePath.split('/').map(encodeURIComponent).join('/')}`;

  return {
    publicUrl,

    async inspect(storagePath: string): Promise<StoredListingMedia | null> {
      if (!base) throw new Error('SUPABASE_URL is required to verify listing photos');
      const response = await fetchImpl(publicUrl(storagePath), { method: 'HEAD' });
      if (response.status === 404 || response.status === 400) return null;
      if (!response.ok) {
        throw new Error(`Storage answered ${response.status} while checking a listing photo`);
      }
      const contentType = (response.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
      const sizeBytes = Number(response.headers.get('content-length') ?? '0');
      return { contentType, sizeBytes };
    },
  };
}
