import sharp from "sharp";
import type { PartnerLogoProcessor } from "@/application/ports/providers/partner-logo-processor.port.ts";
import {
  MAX_LOGO_BYTES,
  MAX_STORED_LOGO_BYTES,
  PartnerInputError,
  PartnerUnavailableError,
} from "@/domain/partners/partner-shell.ts";
export function partnerLogoProcessor(): PartnerLogoProcessor {
  let active = 0;
  return {
    async prepare(data, contentType) {
      if (active >= 2)
        throw new PartnerUnavailableError(
          "Image processing is busy. Try again.",
        );
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(contentType) ||
        data.length > Math.ceil(MAX_LOGO_BYTES / 3) * 4 ||
        !data ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(data)
      )
        throw new PartnerInputError(
          "Choose a JPEG, PNG or WebP image up to 2 MiB.",
        );
      const bytes = Buffer.from(data, "base64");
      if (bytes.length > MAX_LOGO_BYTES || bytes.toString("base64") !== data)
        throw new PartnerInputError("Invalid image data.");
      active++;
      try {
        const image = sharp(bytes, {
            limitInputPixels: 16_000_000,
            animated: true,
          }),
          metadata = await image.metadata();
        if (
          !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
          (metadata.pages ?? 1) > 1
        )
          throw new Error("unsupported");
        const body = await image
          .rotate()
          .resize({
            width: 256,
            height: 256,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 88 })
          .toBuffer();
        if (body.length > MAX_STORED_LOGO_BYTES) throw new Error("too large");
        return `data:image/webp;base64,${body.toString("base64")}`;
      } catch {
        throw new PartnerInputError(
          "This image is damaged, animated or exceeds 16 million pixels.",
        );
      } finally {
        active--;
      }
    },
  };
}
