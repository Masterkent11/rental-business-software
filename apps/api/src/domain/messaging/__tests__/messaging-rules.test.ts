import { describe, expect, it } from 'vitest';
import {
  InvalidMessageError,
  assertRentalMessagingAllowed,
  ConversationNotAllowedError,
  isUnread,
  normaliseMessageBody,
  previewOf,
  shouldNotifyRecipient,
} from '@/domain/messaging/conversation.ts';

describe('messaging rules', () => {
  it('trims bodies and refuses empty or oversized messages', () => {
    expect(normaliseMessageBody('  hello \r\n')).toBe('hello');
    expect(() => normaliseMessageBody('   ')).toThrow(InvalidMessageError);
    expect(() => normaliseMessageBody('x'.repeat(4001))).toThrow(InvalidMessageError);
  });

  it('builds a single-line preview', () => {
    expect(previewOf('a\n\nb')).toBe('a b');
    expect(previewOf('x'.repeat(200)).length).toBe(140);
  });

  it('counts only messages from the other side as unread', () => {
    const at = new Date('2027-01-01T10:00:00Z');
    expect(isUnread({ lastMessageAt: at, lastSenderRole: 'CUSTOMER', readerRole: 'OWNER', readerLastReadAt: null })).toBe(true);
    expect(isUnread({ lastMessageAt: at, lastSenderRole: 'OWNER', readerRole: 'OWNER', readerLastReadAt: null })).toBe(false);
    expect(
      isUnread({ lastMessageAt: at, lastSenderRole: 'CUSTOMER', readerRole: 'OWNER', readerLastReadAt: new Date('2027-01-01T11:00:00Z') }),
    ).toBe(false);
  });

  it('notifies on the first message of a burst, not every message', () => {
    const now = new Date('2027-01-01T10:10:00Z');
    expect(shouldNotifyRecipient({ previousSenderRole: null, previousMessageAt: null, senderRole: 'CUSTOMER', now })).toBe(true);
    expect(
      shouldNotifyRecipient({ previousSenderRole: 'CUSTOMER', previousMessageAt: new Date('2027-01-01T10:05:00Z'), senderRole: 'CUSTOMER', now }),
    ).toBe(false);
    expect(
      shouldNotifyRecipient({ previousSenderRole: 'OWNER', previousMessageAt: new Date('2027-01-01T10:05:00Z'), senderRole: 'CUSTOMER', now }),
    ).toBe(true);
  });
});

describe('rental messaging eligibility', () => {
  it('blocks pre-transaction rental messaging and keeps sale inquiries', () => {
    expect(() => assertRentalMessagingAllowed('RENT', false)).toThrow(ConversationNotAllowedError);
    expect(() => assertRentalMessagingAllowed('RENT', true)).not.toThrow();
    expect(() => assertRentalMessagingAllowed('SALE', false)).not.toThrow();
  });
});
