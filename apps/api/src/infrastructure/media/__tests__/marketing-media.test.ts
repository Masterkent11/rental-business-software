import { expect, it } from "vitest";
import sharp from "sharp";
import { marketingMediaProcessor } from "@/infrastructure/media/marketing-media-processor.adapter.ts";
const processor = marketingMediaProcessor();
it("normalizes supported images and strips embedded metadata", async () => {
  const image = await sharp({
    create: { width: 24, height: 18, channels: 3, background: "#227744" },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const result = await processor.prepare(image.toString("base64"), "image/png");
  const meta = await sharp(result.body).metadata();
  expect(result.contentType).toBe("image/jpeg");
  expect(meta.width).toBe(24);
  expect(meta.exif).toBeUndefined();
});
it("rejects oversized, malformed, unsupported and mislabeled content", async () => {
  await expect(
    processor.prepare("x".repeat(12_000_000), "image/jpeg"),
  ).rejects.toThrow();
  await expect(
    processor.prepare(Buffer.from("<svg/>").toString("base64"), "image/png"),
  ).rejects.toThrow();
  await expect(processor.prepare("%%%", "image/jpeg")).rejects.toThrow();
  await expect(
    processor.prepare(Buffer.alloc(24).toString("base64"), "video/mp4"),
  ).rejects.toThrow();
});
it("requires complete bounded MP4 top level boxes without claiming codec processing", async () => {
  const ftyp = Buffer.alloc(24);
  ftyp.writeUInt32BE(24);
  ftyp.write("ftyp", 4);
  ftyp.write("isom", 8);
  const moov = Buffer.alloc(8);
  moov.writeUInt32BE(8);
  moov.write("moov", 4);
  const mdat = Buffer.alloc(16);
  mdat.writeUInt32BE(16);
  mdat.write("mdat", 4);
  const file = Buffer.concat([ftyp, moov, mdat]);
  expect(
    (await processor.prepare(file.toString("base64"), "video/mp4")).body.equals(
      file,
    ),
  ).toBe(true);
  await expect(
    processor.prepare(ftyp.toString("base64"), "video/mp4"),
  ).rejects.toThrow();
});

it("refuses excess parallel image processing rather than building an unbounded queue", async () => {
  const image = (
    await sharp({
      create: { width: 100, height: 100, channels: 3, background: "#227744" },
    })
      .png()
      .toBuffer()
  ).toString("base64");
  const bounded = marketingMediaProcessor();
  const result = await Promise.allSettled(
    Array.from({ length: 3 }, () => bounded.prepare(image, "image/png")),
  );
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(2);
  expect(result.filter((r) => r.status === "rejected")).toHaveLength(1);
});
