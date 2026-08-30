export interface StoredObject {
  readonly path: string;
  readonly body: Buffer;
  readonly contentType: string;
}

export interface MediaStorage {
  put(objects: readonly StoredObject[]): Promise<void>;
  createReadUrl(path: string): Promise<string>;
}
