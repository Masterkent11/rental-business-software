import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { partnerLogoProcessor } from "@/infrastructure/media/partner-logo-processor.adapter.ts";
describe("Partner logo image boundary", () => {
  it("normalizes a real image with alpha, downsizes and strips metadata", async () => {
    const input = await sharp({
      create: { width: 600, height: 300, channels: 4, background: "#12345680" },
    })
      .png()
      .toBuffer();
    const result = await partnerLogoProcessor().prepare(
      input.toString("base64"),
      "image/png",
    );
    const metadata = await sharp(
      Buffer.from(result.split(",")[1]!, "base64"),
    ).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(128);
    expect(metadata.hasAlpha).toBe(true);
    expect(metadata.exif).toBeUndefined();
  });
  it("rejects forged SVG, corrupted bytes, oversized data and unsupported content types", async () => {
    const processor = partnerLogoProcessor();
    for (const [data, type] of [
      [Buffer.from("<svg/>").toString("base64"), "image/png"],
      ["invalid", "image/png"],
      ["A".repeat(2800000), "image/png"],
      ["AAAA", "image/svg+xml"],
    ])
      await expect(processor.prepare(data!, type!)).rejects.toThrow();
  });
});
