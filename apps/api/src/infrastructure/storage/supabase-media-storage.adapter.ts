import type {
  MediaStorage,
  StorageCredentials,
  StoredObject,
} from "@/application/ports/storage/media-storage.port.ts";

const BUCKET = "tour-media";

const CACHE_SECONDS = 31_536_000;

export function supabaseMediaStorage(
  supabaseUrl = process.env.SUPABASE_URL ?? "",
  serviceKey = process.env.SUPABASE_SERVICE_KEY ?? "",
  publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  options: { bucket?: string; private?: boolean } = {},
): MediaStorage {
  const base = supabaseUrl.replace(/\/$/, "");
  const bucket = options.bucket ?? BUCKET;
  const request = (url: string, init: RequestInit) =>
    fetch(url, {
      ...init,
      ...(options.private ? { signal: AbortSignal.timeout(15_000) } : {}),
    });

  const headersFor = (
    credentials?: StorageCredentials,
  ): Record<string, string> => {
    if (!base) throw new Error("SUPABASE_URL is required to store tour media");
    if (credentials) {
      if (!publishableKey) {
        throw new Error(
          "SUPABASE_PUBLISHABLE_KEY is required to store tour media on behalf of a signed-in user",
        );
      }
      return {
        apikey: publishableKey,
        authorization: `Bearer ${credentials.accessToken}`,
      };
    }
    if (!serviceKey) {
      throw new Error(
        "Tour media uploads need a signed-in user or SUPABASE_SERVICE_KEY",
      );
    }
    return { apikey: serviceKey, authorization: `Bearer ${serviceKey}` };
  };

  const list = async (
    prefix: string,
    headers: Record<string, string>,
  ): Promise<string[]> => {
    const files: string[] = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const response = await request(
        `${base}/storage/v1/object/list/${bucket}`,
        {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({
            prefix,
            limit: pageSize,
            offset,
            sortBy: { column: "name", order: "asc" },
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          `Storage refused to list ${prefix} (${response.status}): ${await response.text()}`,
        );
      }
      const entries = (await response.json()) as {
        name: string;
        id: string | null;
      }[];
      for (const entry of entries) {
        const path = `${prefix}/${entry.name}`;
        if (entry.id === null) files.push(...(await list(path, headers)));
        else files.push(path);
      }
      if (entries.length < pageSize) break;
    }
    return files;
  };

  return {
    async put(
      objects: readonly StoredObject[],
      credentials?: StorageCredentials,
    ): Promise<void> {
      const headers = headersFor(credentials);
      const batchSize = 8;
      for (let i = 0; i < objects.length; i += batchSize) {
        const batch = objects.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (object) => {
            const response = await request(
              `${base}/storage/v1/object/${bucket}/${object.path}`,
              {
                method: "POST",
                headers: {
                  ...headers,
                  "content-type": object.contentType,
                  "cache-control": options.private
                    ? "private, no-store"
                    : `max-age=${CACHE_SECONDS}`,
                  "x-upsert": "true",
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
      if (!base) throw new Error("SUPABASE_URL is required to read tour media");
      if (options.private) {
        const response = await request(
          `${base}/storage/v1/object/sign/${bucket}/${path}`,
          {
            method: "POST",
            headers: { ...headersFor(), "content-type": "application/json" },
            body: JSON.stringify({ expiresIn: 120 }),
          },
        );
        if (!response.ok) throw new Error("Private media is unavailable");
        const result = (await response.json()) as { signedURL: string };
        return `${base}/storage/v1${result.signedURL}`;
      }
      return `${base}/storage/v1/object/public/${bucket}/${path}`;
    },

    async removePrefix(
      prefix: string,
      credentials?: StorageCredentials,
    ): Promise<number> {
      const headers = headersFor(credentials);
      const files = await list(prefix.replace(/\/$/, ""), headers);
      for (let i = 0; i < files.length; i += 100) {
        const response = await request(`${base}/storage/v1/object/${bucket}`, {
          method: "DELETE",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({ prefixes: files.slice(i, i + 100) }),
        });
        if (!response.ok) {
          throw new Error(
            `Storage refused to delete under ${prefix} (${response.status}): ${await response.text()}`,
          );
        }
      }
      return files.length;
    },
  };
}
