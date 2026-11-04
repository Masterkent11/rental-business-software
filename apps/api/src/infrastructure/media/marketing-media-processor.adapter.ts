import sharp from "sharp";
import type { MarketingMediaProcessor } from "@/application/ports/providers/marketing-media-processor.port.ts";
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MarketingInvalidError,
  MarketingUnavailableError,
} from "@/domain/marketing/marketing.ts";
export function marketingMediaProcessor(): MarketingMediaProcessor {
  let active = 0;
  return {
    async prepare(data, contentType) {
      if (active >= 2)
        throw new MarketingUnavailableError(
          "Media processing is busy. Please try again.",
        );
      active++;
      try {
        const video = contentType === "video/mp4";
        const max = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (
          !["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(
            contentType,
          ) ||
          !data ||
          data.length > Math.ceil(max / 3) * 4 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(data)
        )
          throw new MarketingInvalidError(
            "Upload a supported image up to 8 MiB or MP4 up to 12 MiB.",
          );
        const bytes = Buffer.from(data, "base64");
        if (bytes.length > max || bytes.toString("base64") !== data)
          throw new MarketingInvalidError(
            "The file data is invalid or too large.",
          );
        if (video) {
          if (
            bytes.length < 24 ||
            bytes.toString("ascii", 4, 8) !== "ftyp" ||
            !["isom", "iso2", "mp41", "mp42", "avc1", "M4V "].includes(
              bytes.toString("ascii", 8, 12),
            )
          )
            throw new MarketingInvalidError(
              "Choose a supported MP4 container.",
            );
          let offset = 0;
          const boxes = new Set<string>();
          while (offset < bytes.length) {
            if (offset + 8 > bytes.length)
              throw new MarketingInvalidError(
                "The MP4 container is incomplete.",
              );
            const size = bytes.readUInt32BE(offset);
            const name = bytes.toString("ascii", offset + 4, offset + 8);
            const length =
              size === 0
                ? bytes.length - offset
                : size === 1 && offset + 16 <= bytes.length
                  ? Number(bytes.readBigUInt64BE(offset + 8))
                  : size;
            if (
              !Number.isSafeInteger(length) ||
              length < (size === 1 ? 16 : 8) ||
              offset + length > bytes.length
            )
              throw new MarketingInvalidError(
                "The MP4 container is incomplete.",
              );
            boxes.add(name);
            offset += length;
          }
          if (!boxes.has("moov") || !boxes.has("mdat"))
            throw new MarketingInvalidError("Choose a complete MP4 video.");
          return { body: bytes, contentType };
        }
        try {
          const image = sharp(bytes, {
            limitInputPixels: 20_000_000,
            animated: false,
          });
          const metadata = await image.metadata();
          if (
            !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
            (metadata.pages && metadata.pages > 1)
          )
            throw new Error("unsupported");
          const body = await image
            .rotate()
            .resize({
              width: 4096,
              height: 4096,
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 90 })
            .toBuffer();
          if (body.length > MAX_IMAGE_BYTES) throw new Error("too large");
          return { body, contentType: "image/jpeg" };
        } catch {
          throw new MarketingInvalidError(
            "This image is unsupported, damaged or exceeds 20 million pixels.",
          );
        }
      } finally {
        active--;
      }
    },
  };
}
