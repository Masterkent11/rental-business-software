import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { sharpVerificationImageValidator } from '@/infrastructure/verification/sharp-verification-image.adapter.ts';
import { unavailableVerificationProvider } from '@/infrastructure/verification/unavailable-verification.adapter.ts';
import { VerificationInputError, VerificationUnavailableError } from '@/domain/verification/verification.ts';
import { session } from '@/domain/verification/__tests__/verification.fixture.ts';

describe('evidence validation', () => {
  it('decodes images, removes metadata, and normalizes to JPEG', async () => {
    const bytes = await sharp({ create:{ width:400,height:400,channels:3,background:'#fff' } }).png().withMetadata().toBuffer();
    const normalized = await sharpVerificationImageValidator().validate(bytes);
    const metadata = await sharp(normalized).metadata();
    expect(metadata.format).toBe('jpeg'); expect(metadata.exif).toBeUndefined();
  });
  it('rejects bad data, excessive size, and undersized captures', async () => {
    const validator = sharpVerificationImageValidator();
    await expect(validator.validate(new Uint8Array([1,2,3]))).rejects.toThrow(VerificationInputError);
    await expect(validator.validate(new Uint8Array(8*1024*1024+1))).rejects.toThrow(VerificationInputError);
    const tiny = await sharp({ create:{ width:16,height:16,channels:3,background:'#fff' } }).png().toBuffer();
    await expect(validator.validate(tiny)).rejects.toThrow(VerificationInputError);
  });
  it('has no production success fallback', async () => {
    await expect(unavailableVerificationProvider().verify(session())).rejects.toThrow(VerificationUnavailableError);
  });
});
