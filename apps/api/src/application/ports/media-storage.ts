/**
 * Where processed panorama derivatives live.
 *
 * A separate port from [DocumentStorage] because the two have opposite shapes:
 * documents are uploaded *by the customer* through a signed ticket and read
 * rarely, while tiles are written *by the server* after processing and read
 * constantly by every viewer.
 *
 * Same private-bucket rule though. A tour on an unpublished listing must not be
 * walkable by anyone who guesses a path.
 */
export interface StoredObject {
  readonly path: string;
  readonly body: Buffer;
  readonly contentType: string;
}

export interface MediaStorage {
  /** Write derivatives. Called by the processing worker, never by a client. */
  put(objects: readonly StoredObject[]): Promise<void>;

  /** A short-lived URL for one object. */
  createReadUrl(path: string): Promise<string>;
}
