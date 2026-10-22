import { describe, expect, it } from 'vitest';
import { frontCaptureSchema, faceCaptureSchema } from '@/modules/applications/dto/verification.dto.ts';
describe('verification HTTP input', () => {
  it('does not accept a back image or client verification decisions', () => {
    const front = { captureId:'12345678-1234-4234-8234-123456789abc',imageBase64:'aGVsbG8=',extracted:{ fullName:'',dateOfBirth:'',documentType:'',documentNumber:'' } };
    expect(frontCaptureSchema.safeParse(front).success).toBe(true);
    expect(frontCaptureSchema.safeParse({ ...front,backImageBase64:'aGVsbG8=' }).success).toBe(false);
    expect(frontCaptureSchema.safeParse({ ...front,status:'VERIFIED' }).success).toBe(false);
    expect(faceCaptureSchema.safeParse({ status:'VERIFIED' }).success).toBe(false);
  });
});
