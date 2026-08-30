import type { Listing } from './listing.ts';

/**
 * Only a published listing is public.
 *
 * Expressed here rather than as a `WHERE` clause someone remembers to write,
 * because "a customer must never see an unapproved listing" (D-12) is a domain
 * rule, not a query detail.
 */
export const isPublic = (listing: Listing): boolean =>
  listing.state === 'PUBLISHED';
