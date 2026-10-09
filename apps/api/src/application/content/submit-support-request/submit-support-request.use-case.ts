import type { ContentRepository } from '@/application/ports/repositories/content-repository.port.ts';
import { normaliseSupportRequest, type SupportRequestInput } from '@/domain/content/content.ts';

export const submitSupportRequest =
  (content: ContentRepository) =>
  async (input: SupportRequestInput): Promise<{ readonly received: true }> => {
    await content.submitSupportRequest(normaliseSupportRequest(input));
    return { received: true };
  };
