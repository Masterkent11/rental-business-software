import { describe, expect, it } from 'vitest';
import {
  InvalidInquiryError,
  InvalidInquiryTransitionError,
  assertBuyerBudget,
  composeInquiryOpening,
  nextInquiryStatus,
  normaliseInquiryMessage,
  normaliseInquiryQuestions,
  statusAfterPartnerReply,
  statusAfterViewingConfirmed,
} from '@/domain/inquiries/inquiry.ts';

describe('inquiry rules', () => {
  it('needs a message and keeps it bounded', () => {
    expect(() => normaliseInquiryMessage('   ')).toThrow(InvalidInquiryError);
    expect(() => normaliseInquiryMessage('x'.repeat(2001))).toThrow(InvalidInquiryError);
    expect(normaliseInquiryMessage('  Hi there  ')).toBe('Hi there');
  });

  it('de-duplicates the suggested questions', () => {
    expect(normaliseInquiryQuestions(['Is this available?', 'is this available?', ' '])).toEqual(['Is this available?']);
  });

  it('a private budget must be a positive amount', () => {
    expect(() => assertBuyerBudget(0)).toThrow(InvalidInquiryError);
    expect(() => assertBuyerBudget(1.5)).toThrow(InvalidInquiryError);
    expect(() => assertBuyerBudget(null)).not.toThrow();
  });

  it('the opening message lists the chosen questions', () => {
    expect(composeInquiryOpening('Hello', ['Is this available?'])).toBe('Hello\n\n• Is this available?');
  });

  it('moves through the pipeline but never reopens a closed deal or returns to new', () => {
    expect(nextInquiryStatus('NEW', 'QUALIFIED')).toBe('QUALIFIED');
    expect(nextInquiryStatus('LOST', 'CONTACTED')).toBe('CONTACTED');
    expect(() => nextInquiryStatus('CLOSED', 'NEGOTIATING')).toThrow(InvalidInquiryTransitionError);
    expect(() => nextInquiryStatus('CONTACTED', 'NEW')).toThrow(InvalidInquiryTransitionError);
    expect(() => nextInquiryStatus('QUALIFIED', 'QUALIFIED')).toThrow(InvalidInquiryTransitionError);
  });

  it('advances automatically on the first reply and a confirmed viewing', () => {
    expect(statusAfterPartnerReply('NEW')).toBe('CONTACTED');
    expect(statusAfterPartnerReply('NEGOTIATING')).toBe('NEGOTIATING');
    expect(statusAfterViewingConfirmed('CONTACTED')).toBe('VIEWING_SCHEDULED');
    expect(statusAfterViewingConfirmed('NEGOTIATING')).toBe('NEGOTIATING');
  });
});
