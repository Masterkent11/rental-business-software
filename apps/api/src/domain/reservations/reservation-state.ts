/**
 * The optional way to hold a place while the owner decides.
 *
 * Paying it places a HELD occupancy for [RESERVATION_DAYS] days, so a customer
 * who is serious is not out-competed during the wait. It is the only thing on
 * the long-term path that touches the timeline before a lease exists.
 */
export type ReservationState =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'CREDITED'
  | 'REFUNDED'
  | 'FORFEITED'
  | 'EXPIRED';

export const RESERVATION_DAYS = 7;

/**
 * How long an approved applicant has to pay the advance and deposit.
 *
 * Shorter than a reservation deliberately: a reservation is bought while the
 * owner thinks, whereas this window starts once the owner has already said yes
 * and the resource is off the market for one named person. Every hour of it is
 * an hour nobody else can rent the place.
 */
export const APPROVAL_HOLD_HOURS = 72;
