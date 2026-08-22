import type { HeldCapability } from '../../domain/identity/capability.ts';

export interface UserProfile {
  readonly id: string;
  readonly displayName: string;
  readonly email: string | null;
  readonly mobile: string | null;
}

export interface SavedListing {
  readonly listingId: string;
  readonly savedAt: Date;
}

/**
 * A stay the customer paid for, with the receipt.
 *
 * "What did I pay, for which nights, and how do I prove it" — answered from the
 * payment and the ledger rather than recomputed, because a receipt that
 * disagrees with the ledger is worse than no receipt.
 */
export interface StayReceipt {
  readonly stayId: string;
  readonly reference: string;
  readonly listingTitle: string;
  readonly propertyName: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly nights: number;
  readonly paidCentavos: number;
  readonly paidAt: Date | null;
  readonly state: string;
  readonly photo: string | null;
  /**
   * Server-decided copy and bucket.
   *
   * "Confirmed", "Checked in", "Completed" — decided here, not derived from
   * dates by a client. Three clients deriving it independently is three chances
   * to tell a customer something different about the same stay.
   */
  readonly stateLabel: string;
  readonly bucket: 'ACTIVE' | 'PAST' | 'CANCELLED';
}

/** Everything one authenticated request needs about who is asking. */
export interface PrincipalData {
  readonly profile: UserProfile | null;
  readonly capabilities: readonly HeldCapability[];
  /** Null when no organization was claimed. */
  readonly isMember: boolean | null;
}

export interface UserRepository {
  /**
   * Load the whole principal in **one** round trip.
   *
   * ADR-0007 priced this at "one indexed lookup per authenticated request".
   * Fetching the profile, the capabilities, and the membership as three
   * separate transactions costs three times the BEGIN/set_config/COMMIT round
   * trips — which is invisible on a local socket and roughly 2.5 seconds
   * against a database in another region. The ADR's stated cost is the one
   * worth paying; three times it is not.
   */
  loadPrincipal(
    userId: string,
    organizationId: string | null,
  ): Promise<PrincipalData>;

  findProfile(userId: string): Promise<UserProfile | null>;

  /** Created on first authenticated request — see `resolvePrincipal`. */
  createProfile(input: {
    id: string;
    email: string | null;
    mobile: string | null;
  }): Promise<UserProfile>;

  /** Live capabilities only. Revoked rows must never come back. */
  capabilitiesFor(userId: string): Promise<readonly HeldCapability[]>;

  /** Whether the user holds a live membership in the organization. */
  isMemberOf(userId: string, organizationId: string): Promise<boolean>;

  /** Confirmed stays, newest first. */
  staysFor(userId: string): Promise<readonly StayReceipt[]>;

  savedListingIds(userId: string): Promise<readonly string[]>;
  saveListing(userId: string, listingId: string): Promise<void>;
  unsaveListing(userId: string, listingId: string): Promise<void>;
}
