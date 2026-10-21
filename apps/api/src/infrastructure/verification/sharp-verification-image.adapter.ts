import sharp from 'sharp';
import type { VerificationImageValidator } from '@/application/ports/providers/verification-image.port.ts';
import { VerificationInputError } from '@/domain/verification/verification.ts';
export const sharpVerificationImageValidator = (): VerificationImageValidator => ({
  async validate(bytes) {
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new VerificationInputError('Use an image smaller than 8 MB.');
    try {
      const image = sharp(bytes, { limitInputPixels: 24_000_000, failOn: 'warning' });
      const metadata = await image.metadata();
      if (!['jpeg','png'].includes(metadata.format ?? '') || !metadata.width || !metadata.height ||
          metadata.width < 320 || metadata.height < 320 || (metadata.pages ?? 1) !== 1) throw new Error('Unsupported image');
      const normalized = await image.rotate().jpeg({ quality: 92 }).toBuffer();
      if (normalized.byteLength > 8 * 1024 * 1024) throw new VerificationInputError('Use an image smaller than 8 MB.');
      return normalized;
    } catch (error) {
      if (error instanceof VerificationInputError) throw error;
      throw new VerificationInputError('Use a clear JPEG or PNG image, at least 320 pixels on each side.');
    }
  },
});
