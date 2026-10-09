import type {
  ContentKind,
  ContentPage,
  PolicyAcceptance,
  PolicyAcceptanceInput,
  SupportRequestInput,
} from '@/domain/content/content.ts';

export interface ContentRepository {
  latest(slug: string): Promise<ContentPage | null>;
  list(kind: ContentKind): Promise<ContentPage[]>;
  recordAcceptance(input: PolicyAcceptanceInput): Promise<PolicyAcceptance>;
  acceptances(userId: string): Promise<PolicyAcceptance[]>;
  submitSupportRequest(input: SupportRequestInput): Promise<{ readonly id: string | null }>;
}
