import { DomainError } from '@/domain/shared/domain-error.ts';

export type ContentKind = 'LEGAL' | 'HELP';
export type ContentStatus = 'DRAFT' | 'APPROVED' | 'RETIRED';
export type AcceptanceContext = 'SIGN_UP' | 'BOOKING' | 'INQUIRY' | 'VIEWING' | 'POLICY_UPDATE';
export type SupportTopic = 'ACCOUNT' | 'BOOKING' | 'PAYMENT' | 'LISTING_REPORT' | 'INQUIRY_VIEWING' | 'PRIVACY' | 'OTHER';

export const SUPPORT_TOPICS: readonly SupportTopic[] = [
  'ACCOUNT',
  'BOOKING',
  'PAYMENT',
  'LISTING_REPORT',
  'INQUIRY_VIEWING',
  'PRIVACY',
  'OTHER',
];

export interface ContentPage {
  readonly slug: string;
  readonly version: number;
  readonly kind: ContentKind;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly status: ContentStatus;
  readonly requiresAcceptance: boolean;
  readonly effectiveOn: string | null;
  readonly publishedAt: Date | null;
}

export interface PolicyAcceptanceInput {
  readonly userId: string;
  readonly slug: string;
  readonly version: number;
  readonly context: AcceptanceContext;
  readonly relatedId: string | null;
}

export interface PolicyAcceptance extends PolicyAcceptanceInput {
  readonly acceptedAt: Date;
}

export interface SupportRequestInput {
  readonly userId: string | null;
  readonly email: string;
  readonly topic: SupportTopic;
  readonly message: string;
  readonly listingId: string | null;
  readonly clientRef: string;
}

export class ContentNotFoundError extends DomainError {}
export class OutdatedPolicyVersionError extends DomainError {}
export class InvalidSupportRequestError extends DomainError {}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normaliseSupportRequest(input: SupportRequestInput): SupportRequestInput {
  const email = input.email.trim().toLowerCase();
  const message = input.message.replace(/\r\n/g, '\n').trim();
  if (!EMAIL.test(email)) throw new InvalidSupportRequestError('Enter a valid email address so we can reply');
  if (message.length < 10) throw new InvalidSupportRequestError('Tell us a little more, at least 10 characters');
  if (message.length > 4000) throw new InvalidSupportRequestError('Keep your message under 4,000 characters');
  return { ...input, email, message };
}

export function assertCurrentVersion(page: ContentPage | null, version: number): ContentPage {
  if (!page) throw new ContentNotFoundError('That policy does not exist');
  if (page.version !== version) {
    throw new OutdatedPolicyVersionError('This policy has been updated. Review the latest version before accepting.');
  }
  return page;
}
