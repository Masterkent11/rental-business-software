"use client";
import { useMarketingStore } from "@/stores/use-marketing-store";
import { Btn, Field, TextInput, TextArea, Select } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
export function MarketingEditor() {
  const s = useMarketingStore();
  const property = s.snapshot?.properties.find(
    (p) => p.id === s.editor.listingId,
  );
  const ready = s.snapshot?.media.filter((m) => m.state === "READY") ?? [];
  const toggle = (key: "mediaIds" | "sourcePhotos", value: string) =>
    s.field(
      key,
      s.editor[key].includes(value)
        ? s.editor[key].filter((v) => v !== value)
        : [...s.editor[key], value],
    );
  return (
    <div className="marketing-editor">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void s.save();
        }}
        className="marketing-form"
      >
        <div className="marketing-section-heading">
          <h2>{s.editingId ? "Edit draft" : "Create content"}</h2>
          <button
            className="marketing-text-button"
            type="button"
            onClick={s.closeEditor}
          >
            Cancel
          </button>
        </div>
        <Field label="Draft title" htmlFor="marketing-title">
          <TextInput
            id="marketing-title"
            value={s.editor.title}
            onChange={(e) => s.field("title", e.target.value)}
            maxLength={120}
            required
          />
        </Field>
        <Field
          label="Property"
          htmlFor="marketing-property"
          hint="Only current approved representations with editing permission are listed."
        >
          <Select
            id="marketing-property"
            value={s.editor.listingId ?? ""}
            onChange={(e) => {
              s.field("listingId", e.target.value || null);
              s.field("sourcePhotos", []);
            }}
          >
            <option value="">General content without a property</option>
            {s.snapshot?.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
        {s.editor.listingId && !property ? (
          <p className="marketing-warning">
            Property access changed. Choose another property or general content
            before saving.
          </p>
        ) : null}
        {property?.photos.length ? (
          <fieldset>
            <legend>Property photos</legend>
            <div className="marketing-photo-grid">
              {property.photos.map((url) => (
                <label key={url} className="marketing-photo-choice">
                  <Photo
                    src={url}
                    alt="Authorized property photo"
                    className="h-24 w-full rounded-lg"
                  />
                  <span>
                    <input
                      type="checkbox"
                      checked={s.editor.sourcePhotos.includes(url)}
                      onChange={() => toggle("sourcePhotos", url)}
                    />{" "}
                    Select photo
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <fieldset>
          <legend>Library media</legend>
          {!ready.length ? (
            <p className="marketing-muted">
              Upload files in Media Library, then select them here.
            </p>
          ) : (
            <div className="marketing-media-choices">
              {ready.map((m) => (
                <label key={m.id}>
                  <input
                    type="checkbox"
                    checked={s.editor.mediaIds.includes(m.id)}
                    onChange={() => toggle("mediaIds", m.id)}
                  />
                  <span>{m.fileName}</span>
                  <button
                    type="button"
                    className="marketing-text-button"
                    onClick={(e) => {
                      e.preventDefault();
                      void s.readMedia(m.id);
                    }}
                  >
                    Preview
                  </button>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <Field
          label="Caption"
          htmlFor="marketing-caption"
          hint={`${s.editor.caption.length} of 2200 characters`}
        >
          <TextArea
            id="marketing-caption"
            value={s.editor.caption}
            onChange={(e) => s.field("caption", e.target.value)}
            maxLength={2200}
            rows={6}
          />
        </Field>
        <Field label="Internal status" htmlFor="marketing-status">
          <Select
            id="marketing-status"
            value={s.editor.state}
            onChange={(e) =>
              s.field("state", e.target.value as "DRAFT" | "READY_FOR_REVIEW")
            }
          >
            <option value="DRAFT">Draft</option>
            <option value="READY_FOR_REVIEW">Ready for review</option>
          </Select>
        </Field>
        <p className="marketing-muted">
          Saving does not publish to any channel. Select up to 10 media items.
        </p>
        <Btn type="submit" busy={s.busy}>
          Save draft
        </Btn>
      </form>
      <section
        className="marketing-content-preview"
        aria-label="Content preview"
      >
        <p className="marketing-kicker">CONTENT PREVIEW</p>
        <h2>{s.editor.title || "Your draft title"}</h2>
        {property ? <p className="marketing-muted">{property.title}</p> : null}
        {s.editor.sourcePhotos.map((url) => (
          <Photo
            key={url}
            src={url}
            alt="Selected property photo"
            className="mt-4 aspect-[4/3] w-full rounded-xl"
          />
        ))}
        <p className="marketing-caption-preview">
          {s.editor.caption || "Your caption will appear here."}
        </p>
        {s.editor.mediaIds.length ? (
          <ul className="marketing-muted">
            {s.editor.mediaIds.map((id) => (
              <li key={id}>
                {ready.find((m) => m.id === id)?.fileName ??
                  "Media unavailable"}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="marketing-muted">
          Internal preview. Channel specific layouts will be available with
          approved integrations.
        </p>
      </section>
    </div>
  );
}
