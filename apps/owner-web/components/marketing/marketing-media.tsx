"use client";

import { useEffect, useMemo } from "react";
import { createStore, useStore } from "zustand";
import { Upload } from "lucide-react";
import { Btn } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import {
  MARKETING_FILE_TYPES,
  MARKETING_IMAGE_TYPES,
  MARKETING_VIDEO_TYPE,
  type MarketingFormat,
  type MarketingMedia,
} from "@/domain/marketing/marketing";
import { container } from "@/infrastructure/composition/owner-web-container";
import { useMarketingStore } from "@/stores/use-marketing-store";

export function MarketingUpload({ format }: { format?: MarketingFormat }) {
  const { busy, uploading, upload } = useMarketingStore();
  const accept =
    format === "photo"
      ? MARKETING_IMAGE_TYPES
      : format === "video"
        ? MARKETING_VIDEO_TYPE
        : MARKETING_FILE_TYPES;

  function choose(files: FileList | null) {
    if (busy || !files?.length) return;
    void upload(files[0], format !== undefined);
  }

  return (
    <div
      className="marketing-upload"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        choose(event.dataTransfer.files);
      }}
    >
      <Upload size={20} aria-hidden />
      <div>
        <label>
          <strong>Upload media</strong>
          <input
            className="marketing-file-input"
            aria-label="Upload marketing media"
            type="file"
            accept={accept}
            disabled={busy}
            onChange={(event) => {
              choose(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <p>Drop a file here or choose one from your device.</p>
        <p>
          {format !== "video" && "JPEG, PNG or WebP up to 8 MiB."}
          {format === undefined && " "}
          {format !== "photo" && "MP4 up to 12 MiB."}
        </p>
        {uploading && (
          <div className="marketing-upload-progress" role="status">
            <progress aria-label="Uploading media" /> Uploading media…
          </div>
        )}
      </div>
    </div>
  );
}

export function MarketingAssetPreview({ media }: { media: MarketingMedia }) {
  const preview = useMemo(
    () =>
      createStore(() => ({
        attempt: 0,
        result: undefined as
          | { attempt: number; url?: string; error?: string }
          | undefined,
      })),
    [],
  );
  const { attempt, result } = useStore(preview);
  const retry = () =>
    preview.setState(({ attempt }) => ({ attempt: attempt + 1 }));
  useEffect(() => {
    let active = true;
    container.marketing.readMedia(media.id).then(
      ({ url }) => {
        if (active) preview.setState({ result: { attempt, url } });
      },
      () => {
        if (active)
          preview.setState({
            result: {
              attempt,
              error: "The private preview could not be loaded.",
            },
          });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, media.id, preview]);

  if (result?.attempt !== attempt) return <p role="status">Loading preview…</p>;
  if (result.error)
    return (
      <div className="marketing-preview-error">
        <p role="alert">{result.error}</p>
        <Btn type="button" variant="outline" size="sm" onClick={retry}>
          Retry preview
        </Btn>
      </div>
    );

  function showMediaError() {
    if (preview.getState().attempt === attempt) {
      preview.setState({
        result: {
          attempt,
          error:
            "The media could not be displayed. Refresh its private link and try again.",
        },
      });
    }
  }

  return (
    <div className="marketing-asset-preview">
      {media.contentType === MARKETING_VIDEO_TYPE ? (
        <video
          controls
          playsInline
          preload="metadata"
          src={result.url}
          aria-label={media.fileName}
          onError={showMediaError}
        />
      ) : result.url ? (
        <Photo
          src={result.url}
          alt={media.fileName}
          className="marketing-preview-photo"
          sizes="(max-width: 700px) 100vw, 400px"
          onError={showMediaError}
        />
      ) : null}
    </div>
  );
}
