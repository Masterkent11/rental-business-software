"use client";

import { useEffect, useRef, useMemo } from "react";
import { createStore, useStore } from "zustand";
import { Film, ImageIcon, X } from "lucide-react";
import { Btn, Field, TextInput, TextArea, Select } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import {
  marketingMediaFormat,
  type MarketingFormat,
} from "@/domain/marketing/marketing";
import { useMarketingStore } from "@/stores/use-marketing-store";
import { MarketingAssetPreview, MarketingUpload } from "./marketing-media";
import { MarketingPublishingDestinations } from "./marketing-channels";

const formats = [
  { value: "photo", label: "Photo post", icon: ImageIcon },
  { value: "video", label: "Video / Reel", icon: Film },
] as const;

export function MarketingEditor({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const s = useMarketingStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const editorViewport = useRef<HTMLDivElement>(null);
  const previousScroll = useRef(0);
  const view = useMemo(
    () => createStore(() => ({ query: "", preview: false })),
    [],
  );
  const { query, preview } = useStore(view);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    heading.current?.focus();
    return () => node?.close();
  }, []);

  const property = s.snapshot?.properties.find(
    (item) => item.id === s.editor.listingId,
  );
  const propertyOptions =
    s.snapshot?.properties.filter(
      (item) =>
        item.id === s.editor.listingId ||
        `${item.title} ${item.location ?? ""}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
    ) ?? [];
  const media = s.snapshot?.media ?? [];
  const ready = media.filter(
    (asset) =>
      asset.state === "READY" &&
      marketingMediaFormat(asset.contentType) === s.format,
  );
  const hasMedia = s.editor.mediaIds.length + s.editor.sourcePhotos.length > 0;
  const previewMedia = media.find(
    (asset) => asset.id === s.editor.mediaIds[0] && asset.state === "READY",
  );
  const firstPhoto = s.editor.sourcePhotos[0];
  const missingProperty = Boolean(s.editor.listingId && !property);

  function changeFormat(format: MarketingFormat) {
    if (format === s.format) return;
    if (
      !hasMedia ||
      window.confirm(
        "Change format and remove the current attachments from this draft?",
      )
    ) {
      s.changeFormat(format);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="marketing-composer"
      aria-labelledby="marketing-composer-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="marketing-composer-layout">
        <header className="marketing-composer-header">
          <div>
            <h2 id="marketing-composer-title" ref={heading} tabIndex={-1}>
              {s.editingId ? "Edit draft" : "Create post"}
            </h2>
            <p>Prepare content for your next publication.</p>
          </div>
          <Btn
            type="button"
            variant="ghost"
            disabled={s.busy}
            onClick={onCancel}
          >
            <X size={16} aria-hidden /> Cancel
          </Btn>
        </header>

        <div className="marketing-editor" ref={editorViewport}>
          <form
            id="marketing-draft-form"
            className="marketing-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await s.save()) onSaved();
            }}
          >
            <fieldset className="marketing-composer-fields" disabled={s.busy}>
              <fieldset className="marketing-composer-section">
                <legend>Post format</legend>
                <div className="marketing-format-options">
                  {formats.map(({ value, label, icon: Icon }) => (
                    <label key={value} className="marketing-format-option">
                      <input
                        type="radio"
                        name="marketing-format"
                        checked={s.format === value}
                        onChange={() => changeFormat(value)}
                      />
                      <Icon size={17} aria-hidden />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="marketing-composer-section">
                <legend>Media</legend>
                {hasMedia ? (
                  <ul className="marketing-attachments">
                    {s.editor.mediaIds.map((id) => (
                      <li key={id}>
                        <span>
                          {media.find((asset) => asset.id === id)?.fileName ??
                            "Media unavailable"}
                        </span>
                        <button
                          type="button"
                          className="marketing-text-button"
                          onClick={() =>
                            s.field(
                              "mediaIds",
                              s.editor.mediaIds.filter(
                                (assetId) => assetId !== id,
                              ),
                            )
                          }
                        >
                          Remove attachment
                        </button>
                      </li>
                    ))}
                    {s.editor.sourcePhotos.map((url, index) => (
                      <li key={url}>
                        <span>Property photo {index + 1}</span>
                        <button
                          type="button"
                          className="marketing-text-button"
                          onClick={() =>
                            s.field(
                              "sourcePhotos",
                              s.editor.sourcePhotos.filter(
                                (photo) => photo !== url,
                              ),
                            )
                          }
                        >
                          Remove photo
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <MarketingUpload format={s.format} />
                    {ready.length > 0 && (
                      <Field
                        label="Reuse media from library"
                        htmlFor="marketing-media-choice"
                      >
                        <Select
                          id="marketing-media-choice"
                          value=""
                          onChange={(event) => {
                            if (event.target.value)
                              s.field("mediaIds", [event.target.value]);
                          }}
                        >
                          <option value="">Choose an existing file</option>
                          {ready.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.fileName}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}
                  </>
                )}
              </fieldset>

              <fieldset className="marketing-composer-section">
                <legend>
                  Property <span className="marketing-optional">Optional</span>
                </legend>
                {Boolean(s.snapshot?.properties.length) && (
                  <Field
                    label="Search represented properties"
                    htmlFor="marketing-property-search"
                  >
                    <TextInput
                      id="marketing-property-search"
                      type="search"
                      value={query}
                      onChange={(event) =>
                        view.setState({ query: event.target.value })
                      }
                      placeholder="Name or location"
                    />
                  </Field>
                )}
                <Field label="Property" htmlFor="marketing-property">
                  <Select
                    id="marketing-property"
                    value={s.editor.listingId ?? ""}
                    onChange={(event) => {
                      if (
                        s.editor.sourcePhotos.length &&
                        !window.confirm(
                          "Change property and remove its photos from this draft?",
                        )
                      )
                        return;
                      s.field("listingId", event.target.value || null);
                      s.field("sourcePhotos", []);
                    }}
                  >
                    <option value="">General content without a property</option>
                    {missingProperty && (
                      <option value={s.editor.listingId!} disabled>
                        Property access changed
                      </option>
                    )}
                    {propertyOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                        {item.location ? ` · ${item.location}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                {query.trim() && !propertyOptions.length && (
                  <p className="marketing-muted">
                    No properties match your search.
                  </p>
                )}
                {missingProperty && (
                  <p className="marketing-warning" role="alert">
                    Property access changed. Choose another property or select
                    general content.
                  </p>
                )}
                {property && (
                  <div className="marketing-property">
                    {property.photos[0] && (
                      <Photo
                        src={property.photos[0]}
                        alt=""
                        className="marketing-property-thumb"
                      />
                    )}
                    <div>
                      <strong>{property.title}</strong>
                      {property.location && <p>{property.location}</p>}
                    </div>
                  </div>
                )}
                {property?.photos.length &&
                s.format === "photo" &&
                !hasMedia ? (
                  <div
                    className="marketing-photo-grid"
                    aria-label="Property photos"
                  >
                    {property.photos.map((url, index) => (
                      <button
                        key={url}
                        type="button"
                        className="marketing-photo-choice"
                        onClick={() => s.field("sourcePhotos", [url])}
                      >
                        <Photo
                          src={url}
                          alt=""
                          className="marketing-property-choice-photo"
                        />
                        Select photo {index + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
              </fieldset>

              <fieldset className="marketing-composer-section">
                <legend>Post details</legend>
                <Field label="Caption" htmlFor="marketing-caption">
                  <TextArea
                    id="marketing-caption"
                    value={s.editor.caption}
                    onChange={(event) => s.field("caption", event.target.value)}
                    maxLength={2200}
                    rows={4}
                    aria-describedby="marketing-caption-count"
                  />
                  <span
                    id="marketing-caption-count"
                    className="marketing-optional"
                  >
                    {s.editor.caption.length} / 2200 characters
                  </span>
                </Field>
                <Field
                  label="Draft title"
                  htmlFor="marketing-title"
                  hint="Optional. Used only in your workspace."
                >
                  <TextInput
                    id="marketing-title"
                    value={s.editor.title}
                    onChange={(event) => s.field("title", event.target.value)}
                    maxLength={120}
                  />
                </Field>
                <Field label="Internal status" htmlFor="marketing-status">
                  <Select
                    id="marketing-status"
                    value={s.editor.state}
                    onChange={(event) =>
                      s.field(
                        "state",
                        event.target.value === "READY_FOR_REVIEW"
                          ? "READY_FOR_REVIEW"
                          : "DRAFT",
                      )
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="READY_FOR_REVIEW">Ready for review</option>
                  </Select>
                </Field>
              </fieldset>
              <MarketingPublishingDestinations />
            </fieldset>
          </form>

          <section
            id="marketing-post-preview"
            className="marketing-content-preview"
            data-expanded={preview}
            aria-labelledby="marketing-preview-heading"
          >
            <h3
              id="marketing-preview-heading"
              ref={previewHeading}
              tabIndex={-1}
            >
              Post preview
            </h3>
            <p className="marketing-muted">
              Internal preview ·{" "}
              {s.format === "video" ? "Video / Reel" : "Photo post"}
            </p>
            <div className="marketing-preview-card">
              {previewMedia ? (
                <MarketingAssetPreview
                  key={previewMedia.id}
                  media={previewMedia}
                />
              ) : firstPhoto ? (
                <Photo
                  src={firstPhoto}
                  alt="Selected property photo"
                  className="marketing-preview-photo"
                />
              ) : (
                <div className="marketing-preview-placeholder">
                  {s.format === "video" ? (
                    <Film size={26} aria-hidden />
                  ) : (
                    <ImageIcon size={26} aria-hidden />
                  )}
                  <span>Add media to preview your post</span>
                </div>
              )}
              <p className="marketing-caption-preview">
                {s.editor.caption || "Your caption will appear here."}
              </p>
              {property && <p className="marketing-muted">{property.title}</p>}
            </div>
          </section>
        </div>

        <footer className="marketing-composer-footer">
          {s.problem && (
            <p className="marketing-warning" role="alert">
              {s.problem}
            </p>
          )}
          {s.notice && (
            <p className="marketing-notice" role="status">
              {s.notice}
            </p>
          )}
          <div className="marketing-composer-actions">
            <span className="marketing-optional">
              Drafts are private to your workspace.
            </span>
            <Btn
              type="button"
              className="marketing-preview-toggle"
              variant="outline"
              aria-expanded={preview}
              aria-controls="marketing-post-preview"
              onClick={() => {
                if (!preview)
                  previousScroll.current =
                    editorViewport.current?.scrollTop ?? 0;
                view.setState({ preview: !preview });
                requestAnimationFrame(() => {
                  editorViewport.current?.scrollTo(
                    0,
                    preview ? previousScroll.current : 0,
                  );
                  if (!preview)
                    previewHeading.current?.focus({ preventScroll: true });
                });
              }}
            >
              {preview ? "Hide preview" : "Preview"}
            </Btn>
            <Btn
              type="submit"
              form="marketing-draft-form"
              busy={s.busy && !s.uploading}
              disabled={s.uploading || missingProperty}
            >
              {s.busy && !s.uploading ? "Saving draft…" : "Save draft"}
            </Btn>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
