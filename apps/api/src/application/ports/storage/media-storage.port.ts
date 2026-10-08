export interface StoredObject {
  readonly path: string;
  readonly body: Buffer;
  readonly contentType: string;
}

export interface StorageCredentials {
  readonly accessToken: string;
}

export interface MediaStorage {
  put(objects: readonly StoredObject[], credentials?: StorageCredentials): Promise<void>;
  createReadUrl(path: string): Promise<string>;
  removePrefix(prefix: string, credentials?: StorageCredentials): Promise<number>;
}
