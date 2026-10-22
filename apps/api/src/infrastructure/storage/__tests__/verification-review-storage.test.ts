import { describe, expect, it, vi } from 'vitest';
import { supabaseVerificationEvidence } from '@/infrastructure/storage/supabase-verification-evidence.adapter.ts';

describe('private identity review URLs', () => {
  it('signs an owned evidence object with a maximum sixty-second lifetime', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(init!.body as string)).toEqual({ expiresIn: 60 });
      expect(init!.headers).toMatchObject({ authorization: 'Bearer test-server-key', 'cache-control': 'no-store' });
      return new Response(JSON.stringify({ signedURL: '/object/sign/identity-evidence/u/session/front.jpg?token=test' }));
    });
    const storage = supabaseVerificationEvidence('https://storage.test', 'test-server-key', fetcher);
    expect(await storage.reviewUrl('u', 'u/session/front.jpg', 60)).toBe('https://storage.test/storage/v1/object/sign/identity-evidence/u/session/front.jpg?token=test');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects foreign objects, traversal and excessive URL validity before network access', async () => {
    const fetcher = vi.fn();
    const storage = supabaseVerificationEvidence('https://storage.test', 'test-server-key', fetcher);
    for (const [path, seconds] of [['other/front.jpg', 60], ['u/../front.jpg', 60], ['u/front.jpg', 3600]] as const) {
      await expect(storage.reviewUrl('u', path, seconds)).rejects.toThrow();
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
});
