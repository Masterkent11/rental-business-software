"use client";

import { useMemo } from "react";
import { createStore, useStore } from "zustand";
import { FileImage, Film } from "lucide-react";
import { useMarketingStore } from "@/stores/use-marketing-store";
import { Btn, Field, Select, TextInput } from "@/components/owner/ui";
import { marketingMediaFormat } from "@/domain/marketing/marketing";
import { MarketingAssetPreview, MarketingUpload } from "./marketing-media";

const stateLabels = {
  READY: "Ready",
  FAILED: "Upload failed",
  DELETING: "Removal pending",
  PENDING: "Upload pending",
};

export function MarketingLibrary() {
  const { snapshot, busy, removeMedia } = useMarketingStore();
  const view = useMemo(
    () =>
      createStore(() => ({
        query: "",
        format: "all",
        previewId: undefined as string | undefined,
      })),
    [],
  );
  const { query, format, previewId } = useStore(view);
  const media = snapshot?.media ?? [];
  const matches = media.filter(
    (asset) =>
      asset.fileName
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()) &&
      (format === "all" || marketingMediaFormat(asset.contentType) === format),
  );
  const preview = media.find(
    (asset) => asset.id === previewId && asset.state === "READY",
  );

  return (
    <section aria-labelledby="marketing-library-heading">
      <div className="marketing-section-heading">
        <div>
          <h2 id="marketing-library-heading">Media Library</h2>
          <p className="marketing-muted">
            {media.length} of 100 private files · 256 MiB per library
          </p>
        </div>
      </div>
      <MarketingUpload />
      <p className="marketing-muted">
        Images are converted to JPEG with embedded metadata removed. MP4 files
        retain their original encoding.
      </p>
      <div className="marketing-filters">
        <Field label="Search media" htmlFor="marketing-media-search">
          <TextInput
            id="marketing-media-search"
            type="search"
            value={query}
            onChange={(event) => view.setState({ query: event.target.value })}
          />
        </Field>
        <Field label="File type" htmlFor="marketing-media-format">
          <Select
            id="marketing-media-format"
            value={format}
            onChange={(event) => view.setState({ format: event.target.value })}
          >
            <option value="all">All files</option>
            <option value="photo">Images</option>
            <option value="video">Videos</option>
          </Select>
        </Field>
      </div>
      {preview && (
        <section
          className="marketing-selected-preview"
          aria-label="Selected media preview"
        >
          <div className="marketing-section-heading">
            <h3>{preview.fileName}</h3>
            <Btn
              variant="secondary"
              onClick={() => view.setState({ previewId: undefined })}
            >
              Close preview
            </Btn>
          </div>
          <MarketingAssetPreview key={preview.id} media={preview} />
        </section>
      )}
      {!matches.length ? (
        <div className="marketing-empty">
          <FileImage size={26} aria-hidden />
          <h3>
            {media.length ? "No matching files" : "Your library is empty"}
          </h3>
          <p>
            {media.length
              ? "Try a different search or file type."
              : "Upload a file here or from the composer."}
          </p>
        </div>
      ) : (
        <ul className="marketing-media-list">
          {matches.map((asset) => (
            <li key={asset.id}>
              <span className="marketing-file-icon">
                {marketingMediaFormat(asset.contentType) === "video" ? (
                  <Film aria-hidden />
                ) : (
                  <FileImage aria-hidden />
                )}
              </span>
              <div className="marketing-file-name">
                <strong>{asset.fileName}</strong>
                <span>
                  {(asset.bytes / 1024 / 1024).toFixed(1)} MiB ·{" "}
                  {stateLabels[asset.state]}
                </span>
              </div>
              <div className="marketing-row-actions">
                {asset.state === "READY" && (
                  <button
                    className="marketing-text-button"
                    onClick={() => view.setState({ previewId: asset.id })}
                  >
                    Preview
                  </button>
                )}
                <button
                  className="marketing-text-button marketing-delete"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove “${asset.fileName}” from Media Library?`,
                      )
                    )
                      void removeMedia(asset.id);
                  }}
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
