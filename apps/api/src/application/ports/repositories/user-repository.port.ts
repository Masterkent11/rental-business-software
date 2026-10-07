import type { HeldCapability } from '@/domain/identity/identity.ts';

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
  readonly stateLabel: string;
  readonly bucket: 'ACTIVE' | 'PAST' | 'CANCELLED';
}

export interface OrganizationMembershipView {
  readonly organizationId: string;
  readonly name: string;
  readonly role: 'OWNER' | 'STAFF';
  readonly verified: boolean;
}

export interface PrincipalData {
  readonly profile: UserProfile | null;
  readonly capabilities: readonly HeldCapability[];
  readonly isMember: boolean | null;
}

export interface UserRepository {
  loadPrincipal(
    userId: string,
    organizationId: string | null,
  ): Promise<PrincipalData>;

  findProfile(userId: string): Promise<UserProfile | null>;

  createProfile(input: {
    id: string;
    email: string | null;
    mobile: string | null;
    displayName?: string | null;
  }): Promise<UserProfile>;

  updateProfile(
    userId: string,
    patch: { readonly displayName: string },
  ): Promise<UserProfile | null>;

  capabilitiesFor(userId: string): Promise<readonly HeldCapability[]>;

  isMemberOf(userId: string, organizationId: string): Promise<boolean>;

  organizationsFor(userId: string): Promise<readonly OrganizationMembershipView[]>;

  staysFor(userId: string): Promise<readonly StayReceipt[]>;

  savedListingIds(userId: string): Promise<readonly string[]>;
  saveListing(userId: string, listingId: string): Promise<void>;
  unsaveListing(userId: string, listingId: string): Promise<void>;
}
