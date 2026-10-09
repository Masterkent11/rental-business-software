import type { ContentRepository } from '@/application/ports/repositories/content-repository.port.ts';
import {
  assertCurrentVersion,
  type AcceptanceContext,
  type PolicyAcceptance,
} from '@/domain/content/content.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export interface AcceptPolicyInput {
  readonly principal: Principal;
  readonly documents: readonly { readonly slug: string; readonly version: number }[];
  readonly context: AcceptanceContext;
  readonly relatedId: string | null;
}

export const acceptPolicies =
  (content: ContentRepository) =>
  async (input: AcceptPolicyInput): Promise<readonly PolicyAcceptance[]> => {
    const pages = await Promise.all(input.documents.map((doc) => content.latest(doc.slug)));
    input.documents.forEach((doc, index) => assertCurrentVersion(pages[index] ?? null, doc.version));
    const accepted: PolicyAcceptance[] = [];
    for (const doc of input.documents) {
      accepted.push(
        await content.recordAcceptance({
          userId: input.principal.userId,
          slug: doc.slug,
          version: doc.version,
          context: input.context,
          relatedId: input.relatedId,
        }),
      );
    }
    return accepted;
  };

export const listMyAcceptances =
  (content: ContentRepository) =>
  async (input: { readonly principal: Principal }): Promise<readonly PolicyAcceptance[]> =>
    content.acceptances(input.principal.userId);
