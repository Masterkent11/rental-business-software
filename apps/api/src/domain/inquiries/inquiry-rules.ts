import type { InquiryStatus } from './inquiry.ts';
import { InvalidInquiryError, InvalidInquiryTransitionError } from './inquiry-errors.ts';

export const SUGGESTED_INQUIRY_QUESTIONS: readonly string[] = [
  'Is this available?',
  'Can I schedule a viewing?',
  'Can you share more details?',
  'Are there similar properties?',
];

export const MAX_BUYER_BUDGET_CENTAVOS = 10_000_000_000_00;

export function normaliseInquiryMessage(raw: string): string {
  const message = raw.replace(/\r\n/g, '\n').trim();
  if (message.length < 1) throw new InvalidInquiryError('Write a short message to the agent or owner');
  if (message.length > 2000) throw new InvalidInquiryError('Keep the message under 2,000 characters');
  return message;
}

export function normaliseInquiryQuestions(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const question = value.replace(/\s+/g, ' ').trim();
    if (!question) continue;
    if (question.length > 120) throw new InvalidInquiryError('Keep each question under 120 characters');
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(question);
  }
  if (out.length > 8) throw new InvalidInquiryError('Choose at most 8 questions');
  return out;
}

export function assertBuyerBudget(centavos: number | null): void {
  if (centavos === null) return;
  if (!Number.isInteger(centavos) || centavos <= 0 || centavos > MAX_BUYER_BUDGET_CENTAVOS) {
    throw new InvalidInquiryError('Enter your budget as a positive amount');
  }
}

export function composeInquiryOpening(message: string, questions: readonly string[]): string {
  if (questions.length === 0) return message;
  const list = questions.map((question) => `• ${question}`).join('\n');
  const combined = `${message}\n\n${list}`;
  return combined.length > 4000 ? combined.slice(0, 4000) : combined;
}

export const isOpenInquiry = (status: InquiryStatus): boolean => status !== 'CLOSED' && status !== 'LOST';

export function nextInquiryStatus(current: InquiryStatus, target: InquiryStatus): InquiryStatus {
  if (current === target) {
    throw new InvalidInquiryTransitionError('The inquiry is already at that stage');
  }
  if (current === 'CLOSED') {
    throw new InvalidInquiryTransitionError('A closed inquiry cannot be moved');
  }
  if (target === 'NEW') {
    throw new InvalidInquiryTransitionError('An inquiry cannot be moved back to new');
  }
  return target;
}

export function statusAfterPartnerReply(current: InquiryStatus): InquiryStatus {
  return current === 'NEW' ? 'CONTACTED' : current;
}

export function statusAfterViewingConfirmed(current: InquiryStatus): InquiryStatus {
  return current === 'NEW' || current === 'CONTACTED' || current === 'QUALIFIED' ? 'VIEWING_SCHEDULED' : current;
}
