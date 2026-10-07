import { InvalidMessageError } from './messaging-errors.ts';

export const MAX_MESSAGE_LENGTH = 4000;
export const PREVIEW_LENGTH = 140;
export const MESSAGE_PAGE_SIZE = 50;

export function normaliseMessageBody(raw: string): string {
  const body = raw.replace(/\r\n/g, '\n').trim();
  if (body.length === 0) {
    throw new InvalidMessageError('Write a message before sending');
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new InvalidMessageError(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters`);
  }
  return body;
}

export function previewOf(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length <= PREVIEW_LENGTH ? flat : `${flat.slice(0, PREVIEW_LENGTH - 1)}…`;
}

export function isUnread(input: {
  readonly lastMessageAt: Date | null;
  readonly lastSenderRole: 'CUSTOMER' | 'OWNER' | null;
  readonly readerRole: 'CUSTOMER' | 'OWNER';
  readonly readerLastReadAt: Date | null;
}): boolean {
  if (!input.lastMessageAt || !input.lastSenderRole) return false;
  if (input.lastSenderRole === input.readerRole) return false;
  return input.readerLastReadAt === null || input.readerLastReadAt < input.lastMessageAt;
}

export const NOTIFY_GAP_MS = 30 * 60 * 1000;

export function shouldNotifyRecipient(input: {
  readonly previousSenderRole: 'CUSTOMER' | 'OWNER' | null;
  readonly previousMessageAt: Date | null;
  readonly senderRole: 'CUSTOMER' | 'OWNER';
  readonly now: Date;
}): boolean {
  if (input.previousSenderRole === null || input.previousMessageAt === null) return true;
  if (input.previousSenderRole !== input.senderRole) return true;
  return input.now.getTime() - input.previousMessageAt.getTime() > NOTIFY_GAP_MS;
}
