import type { VerificationProvider } from '@/application/ports/providers/verification-provider.port.ts';
import { VerificationUnavailableError } from '@/domain/verification/verification.ts';
export function unavailableVerificationProvider(): VerificationProvider {
  return { async verify() {
    throw new VerificationUnavailableError('Your capture is saved. Server liveness and face matching are not available yet.');
  } };
}
