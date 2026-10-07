import type { PhotoStoragePort, UploadedPhoto } from "../../application/ports/photo-storage.port";
import { env } from "../config/env";
import { currentAccessToken, supabaseBrowserClient } from "../supabase/browser-client";

const BUCKET = "listing-media";

const extensionFor = (type: string) =>
  type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";

export class SupabasePhotoStorageAdapter implements PhotoStoragePort {
  async upload(
    organizationId: string,
    listingId: string,
    file: File,
    onProgress: (fraction: number) => void,
  ): Promise<UploadedPhoto> {
    const token = await currentAccessToken();
    if (!token) throw new Error("Your session has expired. Please sign in again.");

    const storagePath = `${organizationId}/listings/${listingId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
    const url = `${env.supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`;

    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", url);
      request.setRequestHeader("authorization", `Bearer ${token}`);
      request.setRequestHeader("apikey", env.supabasePublishableKey);
      request.setRequestHeader("content-type", file.type);
      request.setRequestHeader("cache-control", "max-age=31536000");
      request.setRequestHeader("x-upsert", "false");
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      };
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          onProgress(1);
          resolve();
        } else if (request.status === 413) {
          reject(new Error("That photo is too large. Use one under 10 MB."));
        } else if (request.status === 403 || request.status === 401) {
          reject(new Error("You can't upload photos for this organization."));
        } else {
          reject(new Error("The upload didn't finish. Please try again."));
        }
      };
      request.onerror = () => reject(new Error("The upload was interrupted. Check your connection and retry."));
      request.send(file);
    });

    return { storagePath };
  }

  async remove(storagePath: string): Promise<void> {
    const { error } = await supabaseBrowserClient().storage.from(BUCKET).remove([storagePath]);
    if (error) throw new Error("The photo was removed from the listing but its file could not be deleted.");
  }
}
