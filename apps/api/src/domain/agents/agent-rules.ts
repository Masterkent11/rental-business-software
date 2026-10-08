import type {
  AgentProfile,
  AgentProfileInput,
  AgentResponseMetrics,
  AgentVerificationState,
  ResponseSample,
} from './agent.ts';
import { InvalidAgentProfileError, InvalidVerificationRequestError } from './agent-errors.ts';

export const MIN_RESPONSE_SAMPLE = 3;
export const RESPONSE_WINDOW_MINUTES = 24 * 60;

const cleanList = (values: readonly string[], max: number, what: string): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.replace(/\s+/g, ' ').trim();
    if (!value) continue;
    if (value.length > 60) throw new InvalidAgentProfileError(`Keep each ${what} under 60 characters`);
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  if (out.length > max) throw new InvalidAgentProfileError(`List at most ${max} ${what}s`);
  return out;
};

export function normaliseAgentProfile(input: AgentProfileInput): AgentProfileInput {
  const displayName = input.displayName.replace(/\s+/g, ' ').trim();
  if (displayName.length < 2 || displayName.length > 80) {
    throw new InvalidAgentProfileError('Use a name between 2 and 80 characters');
  }
  const headline = input.headline.replace(/\s+/g, ' ').trim();
  if (headline.length < 2 || headline.length > 80) {
    throw new InvalidAgentProfileError('Use a headline between 2 and 80 characters');
  }
  const bio = input.bio.trim();
  if (bio.length > 2000) throw new InvalidAgentProfileError('Keep the bio under 2,000 characters');
  const licenseNumber = input.licenseNumber?.replace(/\s+/g, '').trim() || null;
  if (licenseNumber !== null && !/^[A-Za-z0-9-]{3,40}$/.test(licenseNumber)) {
    throw new InvalidAgentProfileError('Enter the license number as shown on your license');
  }
  const licenseAuthority = input.licenseAuthority?.replace(/\s+/g, ' ').trim() || null;
  if (licenseAuthority !== null && licenseAuthority.length > 80) {
    throw new InvalidAgentProfileError('Keep the licensing authority under 80 characters');
  }
  const photoUrl = input.photoUrl?.trim() || null;
  if (photoUrl !== null && !/^https:\/\/[^\s]+$/.test(photoUrl)) {
    throw new InvalidAgentProfileError('The profile photo must be an uploaded image');
  }
  return {
    displayName,
    headline,
    bio,
    licenseNumber,
    licenseAuthority,
    specialties: cleanList(input.specialties, 12, 'specialty'),
    areasServed: cleanList(input.areasServed, 20, 'area'),
    languages: cleanList(input.languages, 10, 'language'),
    publicState: input.publicState === 'HIDDEN' ? 'HIDDEN' : 'PUBLIC',
    photoUrl,
  };
}

export const isVerified = (agent: Pick<AgentProfile, 'verificationState'>): boolean =>
  agent.verificationState === 'VERIFIED';

export const isAssignable = (agent: Pick<AgentProfile, 'verificationState' | 'publicState'>): boolean =>
  agent.verificationState === 'VERIFIED' && agent.publicState === 'PUBLIC';

export function assertMayRequestVerification(agent: Pick<AgentProfile, 'verificationState' | 'licenseNumber'>): void {
  if (agent.verificationState === 'VERIFIED') {
    throw new InvalidVerificationRequestError('Your profile is already verified');
  }
  if (agent.verificationState === 'PENDING') {
    throw new InvalidVerificationRequestError('Your verification request is already being reviewed');
  }
  if (agent.verificationState === 'SUSPENDED') {
    throw new InvalidVerificationRequestError('This profile is suspended. Contact support');
  }
  if (!agent.licenseNumber) {
    throw new InvalidVerificationRequestError('Add your license number before requesting verification');
  }
}

export type VerificationDecision = 'VERIFY' | 'REJECT' | 'SUSPEND';

export function nextVerificationState(
  current: AgentVerificationState,
  decision: VerificationDecision,
): AgentVerificationState {
  switch (decision) {
    case 'VERIFY':
      if (current === 'PENDING' || current === 'REJECTED' || current === 'SUSPENDED') return 'VERIFIED';
      throw new InvalidVerificationRequestError('Only a pending, rejected, or suspended profile can be verified');
    case 'REJECT':
      if (current === 'PENDING') return 'REJECTED';
      throw new InvalidVerificationRequestError('Only a pending request can be rejected');
    case 'SUSPEND':
      if (current === 'VERIFIED') return 'SUSPENDED';
      throw new InvalidVerificationRequestError('Only a verified profile can be suspended');
  }
}

export function responseMetrics(samples: readonly ResponseSample[]): AgentResponseMetrics {
  if (samples.length < MIN_RESPONSE_SAMPLE) {
    return { sampleSize: samples.length, respondedWithinDayRate: null, medianResponseMinutes: null };
  }
  const minutes = samples
    .filter((sample) => sample.firstResponseAt !== null)
    .map((sample) => Math.max(0, (sample.firstResponseAt!.getTime() - sample.createdAt.getTime()) / 60_000))
    .sort((a, b) => a - b);
  const withinDay = minutes.filter((value) => value <= RESPONSE_WINDOW_MINUTES).length;
  const median =
    minutes.length === 0
      ? null
      : minutes.length % 2 === 1
        ? minutes[(minutes.length - 1) / 2]!
        : (minutes[minutes.length / 2 - 1]! + minutes[minutes.length / 2]!) / 2;
  return {
    sampleSize: samples.length,
    respondedWithinDayRate: Math.round((withinDay / samples.length) * 100) / 100,
    medianResponseMinutes: median === null ? null : Math.round(median),
  };
}
