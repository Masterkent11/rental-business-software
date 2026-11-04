"use client";
import { FileImage, Film, Upload } from "lucide-react";
import { useMarketingStore } from "@/stores/use-marketing-store";
import { Btn } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
export function MarketingLibrary() {
  const s = useMarketingStore();
  return (
    <section>
      <div className="marketing-section-heading">
        <div>
          <h2>Media Library</h2>
          <p className="marketing-muted">
            Private files for your drafts. {s.snapshot?.media.length ?? 0} of
            100 files.
          </p>
        </div>
      </div>
      <label className="marketing-upload">
        <Upload size={22} aria-hidden />
        <span>
          <strong>
            {s.busy ? "Working on your upload" : "Choose an image or video"}
          </strong>
          <span>JPEG, PNG, WebP up to 8 MiB. MP4 up to 12 MiB.</span>
        </span>
        <input
          aria-label="Upload marketing media"
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4"
          disabled={s.busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void s.upload(file);
            e.target.value = "";
          }}
        />
      </label>
      <p className="marketing-muted">
        Images are normalized to JPEG without embedded metadata. MP4 files are
        stored without transcoding. Your library is limited to 256 MiB.
      </p>
      {!s.snapshot?.media.length ? (
        <div className="marketing-empty">
          <FileImage size={30} aria-hidden />
          <h3>Your library is empty</h3>
          <p>Upload a file to use in your next draft.</p>
        </div>
      ) : (
        <ul className="marketing-media-list">
          {s.snapshot.media.map((m) => (
            <li key={m.id}>
              <span className="marketing-file-icon">
                {m.contentType.startsWith("video/") ? (
                  <Film aria-hidden />
                ) : (
                  <FileImage aria-hidden />
                )}
              </span>
              <div className="marketing-file-name">
                <strong>{m.fileName}</strong>
                <span>
                  {(m.bytes / 1024 / 1024).toFixed(1)} MiB ·{" "}
                  {m.contentType === "video/mp4" ? "MP4" : "JPEG"} ·{" "}
                  {m.state === "READY"
                    ? "Ready"
                    : m.state === "FAILED"
                      ? "Upload failed"
                      : m.state === "DELETING"
                        ? "Removal pending"
                        : "Upload pending"}
                </span>
              </div>
              <div className="marketing-row-actions">
                {m.state === "READY" ? (
                  <button
                    className="marketing-text-button"
                    onClick={() => void s.readMedia(m.id)}
                  >
                    Preview
                  </button>
                ) : null}
                <button
                  className="marketing-text-button marketing-delete"
                  disabled={s.busy}
                  onClick={() => void s.removeMedia(m.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function MarketingMediaPreview() {
  const s = useMarketingStore();
  if (!s.preview) return null;
  return (
    <section
      className="marketing-selected-preview"
      aria-label="Selected media preview"
    >
      <div className="marketing-section-heading">
        <h2>{s.preview.fileName}</h2>
        <Btn variant="secondary" onClick={s.closePreview}>
          Close preview
        </Btn>
      </div>
      {s.preview.contentType === "video/mp4" ? (
        <video
          controls
          muted
          preload="metadata"
          src={s.preview.url}
          aria-label={s.preview.fileName}
        />
      ) : (
        <Photo
          src={s.preview.url}
          alt={s.preview.fileName}
          className="aspect-video w-full"
        />
      )}
      <p className="marketing-muted">
        This private preview link expires shortly. Open Preview again to refresh
        it.
      </p>
    </section>
  );
}
