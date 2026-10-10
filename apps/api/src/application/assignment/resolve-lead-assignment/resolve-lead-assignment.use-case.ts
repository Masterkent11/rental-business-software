import type { LeadAssignmentRepository, NewLeadAssignment } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { AssignableListing, LeadAssignmentSettings } from '@/application/assignment/assignment.types.ts';
import {
  FAIRNESS_LOOKBACK_DAYS,
  RELIABILITY_LOOKBACK_DAYS,
  resolveAssignment,
  type AssignmentDecision,
  type LeadAssignment,
  type LeadPurpose,
  type PreferredSchedule,
} from '@/domain/assignment/lead-assignment.ts';
import { CATEGORY_LABELS } from '@/domain/discovery/categories.ts';
import { windowBounds } from '@/domain/viewings/viewing.ts';
import type { PropertyType } from '@/domain/listings/listing-state.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export interface LeadAssignmentResolution {
  readonly decision: AssignmentDecision;
  readonly existing: LeadAssignment | null;
}

export const resolveLeadAssignment =
  (assignments: LeadAssignmentRepository, clock: Clock) =>
  async (input: {
    readonly listing: AssignableListing;
    readonly customerId: string;
    readonly purpose: LeadPurpose;
    readonly schedule: PreferredSchedule | null;
    readonly referralCode: string | null;
    readonly excludedAgentIds?: readonly string[];
    readonly existing?: LeadAssignment | null;
  }): Promise<LeadAssignmentResolution> => {
    const now = clock.now();
    const existing =
      input.existing !== undefined ? input.existing : await assignments.activeFor(input.customerId, input.listing.id);
    const referralAgentId = input.referralCode
      ? await assignments.attributeReferral(input.customerId, input.listing.id, input.referralCode)
      : await assignments.referralAgentFor(input.customerId, input.listing.id);
    const bounds = input.schedule ? windowBounds(input.schedule.date, input.schedule.window) : null;
    const candidates = await assignments.candidates({
      listingId: input.listing.id,
      customerId: input.customerId,
      window:
        input.schedule && bounds
          ? { from: bounds.from, to: bounds.to, day: input.schedule.date, name: input.schedule.window }
          : null,
      fairnessSince: new Date(now.getTime() - FAIRNESS_LOOKBACK_DAYS * DAY_MS),
      reliabilitySince: new Date(now.getTime() - RELIABILITY_LOOKBACK_DAYS * DAY_MS),
    });
    const labels = input.listing.propertyType ? CATEGORY_LABELS[input.listing.propertyType as PropertyType] ?? [] : [];
    const decision = resolveAssignment(candidates, {
      purpose: input.purpose,
      listing: {
        listingId: input.listing.id,
        propertyTypeLabels: labels,
        areaLabel: input.listing.areaLabel,
        cityLabel: input.listing.cityLabel,
      },
      customerId: input.customerId,
      existing,
      referralAgentId,
      schedule: input.schedule,
      excludedAgentIds: input.excludedAgentIds ?? [],
      now,
    });
    return { decision, existing };
  };

export function newAssignmentFrom(
  decision: Extract<AssignmentDecision, { kind: 'ASSIGNED' }>,
  context: {
    readonly listing: AssignableListing;
    readonly customerId: string;
    readonly purpose: LeadPurpose;
    readonly previousAssignmentId: string | null;
    readonly settings: LeadAssignmentSettings;
    readonly now: Date;
  },
): NewLeadAssignment {
  return {
    organizationId: context.listing.organizationId,
    listingId: context.listing.id,
    customerId: context.customerId,
    representationId: decision.candidate.representationId,
    agentId: decision.candidate.agentId,
    purpose: context.purpose,
    reason: decision.reason,
    score: decision.score,
    breakdown: decision.breakdown,
    considered: decision.considered,
    previousAssignmentId: context.previousAssignmentId,
    responseDueAt: new Date(context.now.getTime() + context.settings.responseWindowMinutes * MINUTE_MS),
    assignedAt: context.now,
  };
}
