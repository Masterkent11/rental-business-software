import type { AgentVerificationState } from "../workspace/workspace";
import type { AgentPermissions } from "../listings/listing";

export interface AgentProfile {
  readonly id: string;
  readonly displayName: string;
  readonly headline: string;
  readonly bio: string;
  readonly photoUrl: string | null;
  readonly verified: boolean;
  readonly licenseNumber: string | null;
  readonly licenseAuthority: string | null;
  readonly verificationState: AgentVerificationState;
  readonly specialties: readonly string[];
  readonly areasServed: readonly string[];
  readonly languages: readonly string[];
  readonly publicState: "PUBLIC" | "HIDDEN";
}

export interface PublicAgent {
  readonly id: string;
  readonly displayName: string;
  readonly headline: string;
  readonly photoUrl: string | null;
  readonly verified: boolean;
  readonly specialties: readonly string[];
  readonly areasServed: readonly string[];
}

export type RepresentationState = "PENDING" | "ACTIVE" | "ENDED";

export interface Representation {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingIntent: "RENT" | "SALE";
  readonly listingState: string;
  readonly listingPhoto: string | null;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly state: RepresentationState;
  readonly permissions: AgentPermissions;
  readonly invitedAt: string;
  readonly respondedAt: string | null;
  readonly endedAt: string | null;
}

export interface AgentProfileForm {
  displayName: string;
  headline: string;
  bio: string;
  licenseNumber: string;
  licenseAuthority: string;
  specialties: string[];
  areasServed: string[];
  languages: string[];
  publicState: "PUBLIC" | "HIDDEN";
}

export type AgentProfileErrors = Partial<Record<keyof AgentProfileForm, string>>;

export const VERIFICATION_LABEL: Record<AgentVerificationState, string> = {
  UNVERIFIED: "Not verified",
  PENDING: "Verification in review",
  VERIFIED: "Verified agent",
  REJECTED: "Verification needs changes",
  SUSPENDED: "Suspended",
};

export const PERMISSION_LABEL: Record<keyof AgentPermissions, { label: string; hint: string }> = {
  canEditListing: { label: "Edit listing", hint: "Details, photos and floor plans" },
  canManageTour: { label: "Manage virtual tour", hint: "Rooms, hotspots and publishing" },
  canViewCommercial: { label: "See private terms", hint: "Internal asking price and notes" },
};

export const emptyAgentForm = (displayName = ""): AgentProfileForm => ({
  displayName,
  headline: "Licensed real estate agent",
  bio: "",
  licenseNumber: "",
  licenseAuthority: "PRC",
  specialties: [],
  areasServed: [],
  languages: [],
  publicState: "PUBLIC",
});

export const agentFormFrom = (profile: AgentProfile): AgentProfileForm => ({
  displayName: profile.displayName,
  headline: profile.headline,
  bio: profile.bio,
  licenseNumber: profile.licenseNumber ?? "",
  licenseAuthority: profile.licenseAuthority ?? "",
  specialties: [...profile.specialties],
  areasServed: [...profile.areasServed],
  languages: [...profile.languages],
  publicState: profile.publicState,
});

export function validateAgentForm(form: AgentProfileForm): AgentProfileErrors {
  const errors: AgentProfileErrors = {};
  if (form.displayName.trim().length < 2 || form.displayName.trim().length > 80) errors.displayName = "Use 2 to 80 characters";
  if (form.headline.trim().length < 2 || form.headline.trim().length > 80) errors.headline = "Use 2 to 80 characters";
  if (form.bio.length > 2000) errors.bio = "Keep it under 2,000 characters";
  if (form.licenseNumber && !/^[A-Za-z0-9-]{3,40}$/.test(form.licenseNumber.replace(/\s+/g, ""))) {
    errors.licenseNumber = "Use letters, numbers and dashes as on your license";
  }
  return errors;
}

export const canRequestVerification = (profile: AgentProfile): boolean =>
  (profile.verificationState === "UNVERIFIED" || profile.verificationState === "REJECTED") && Boolean(profile.licenseNumber);
