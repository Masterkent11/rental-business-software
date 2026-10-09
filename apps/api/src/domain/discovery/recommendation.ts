import type { ListingIntent, PropertyType } from '@/domain/listings/listing-state.ts';

export type InterestKind = 'VIEW' | 'SAVE' | 'INQUIRY' | 'VIEWING_REQUEST';

export const INTEREST_WEIGHTS: Readonly<Record<InterestKind, number>> = {
  VIEW: 1,
  SAVE: 3,
  INQUIRY: 5,
  VIEWING_REQUEST: 6,
};

export const RECOMMENDATION_WEIGHTS = {
  location: 4,
  propertyTypeInterest: 1.5,
  areaInterest: 1,
  quality: 1,
  freshness: 0.8,
  availability: 1,
} as const;

export const NEARBY_RADIUS_KM = 60;
export const FRESHNESS_HALF_LIFE_DAYS = 30;
export const SAME_PROPERTY_PENALTY = 0.55;
export const SAME_AREA_PENALTY = 0.85;
export const SAME_AREA_ALLOWANCE = 2;

export interface InterestSignal {
  readonly kind: InterestKind;
  readonly intent: ListingIntent;
  readonly propertyType: PropertyType | null;
  readonly areaLabel: string;
  readonly cityLabel: string;
}

export interface InterestProfile {
  readonly propertyTypes: ReadonlyMap<PropertyType, number>;
  readonly areas: ReadonlyMap<string, number>;
}

export interface RecommendationCandidate {
  readonly id: string;
  readonly intent: ListingIntent;
  readonly propertyId: string | null;
  readonly propertyType: PropertyType | null;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly distanceKm: number | null;
  readonly photoCount: number;
  readonly hasTour: boolean;
  readonly descriptionLength: number;
  readonly hasLocation: boolean;
  readonly isAvailable: boolean;
  readonly publishedAt: Date | null;
}

export interface RecommendationContext {
  readonly intent: ListingIntent;
  readonly explicitCity: string | null;
  readonly hasOrigin: boolean;
  readonly interest: InterestProfile;
  readonly now: Date;
}

export interface ScoredCandidate<T extends RecommendationCandidate = RecommendationCandidate> {
  readonly candidate: T;
  readonly score: number;
}

const normalise = (value: string) => value.trim().toLowerCase();

export const areaKey = (areaLabel: string, cityLabel: string) => `${normalise(areaLabel)}|${normalise(cityLabel)}`;

export function buildInterestProfile(signals: readonly InterestSignal[], intent: ListingIntent): InterestProfile {
  const propertyTypes = new Map<PropertyType, number>();
  const areas = new Map<string, number>();
  let total = 0;
  for (const signal of signals) {
    if (signal.intent !== intent) continue;
    const weight = INTEREST_WEIGHTS[signal.kind];
    total += weight;
    if (signal.propertyType) propertyTypes.set(signal.propertyType, (propertyTypes.get(signal.propertyType) ?? 0) + weight);
    const key = areaKey(signal.areaLabel, signal.cityLabel);
    areas.set(key, (areas.get(key) ?? 0) + weight);
  }
  if (total === 0) return { propertyTypes, areas };
  const scale = <K>(map: Map<K, number>) => new Map([...map].map(([key, value]) => [key, value / total] as const));
  return { propertyTypes: scale(propertyTypes), areas: scale(areas) };
}

export const EMPTY_INTEREST: InterestProfile = { propertyTypes: new Map(), areas: new Map() };

export function locationRelevance(candidate: RecommendationCandidate, context: RecommendationContext): number {
  if (context.explicitCity) {
    return normalise(candidate.cityLabel) === normalise(context.explicitCity) ? 1 : 0;
  }
  if (!context.hasOrigin || candidate.distanceKm === null) return 0;
  return Math.max(0, 1 - candidate.distanceKm / NEARBY_RADIUS_KM);
}

export function qualityScore(candidate: RecommendationCandidate): number {
  const photos = Math.min(candidate.photoCount, 5) / 5;
  return (
    photos * 0.4 +
    (candidate.hasTour ? 0.3 : 0) +
    (candidate.descriptionLength >= 120 ? 0.2 : candidate.descriptionLength / 600) +
    (candidate.hasLocation ? 0.1 : 0)
  );
}

export function freshnessScore(publishedAt: Date | null, now: Date): number {
  if (!publishedAt) return 0;
  const ageDays = Math.max(0, (now.getTime() - publishedAt.getTime()) / 86_400_000);
  return Math.pow(0.5, ageDays / FRESHNESS_HALF_LIFE_DAYS);
}

export function scoreCandidate(candidate: RecommendationCandidate, context: RecommendationContext): number {
  const w = RECOMMENDATION_WEIGHTS;
  const typeInterest = candidate.propertyType ? (context.interest.propertyTypes.get(candidate.propertyType) ?? 0) : 0;
  const areaInterest = context.interest.areas.get(areaKey(candidate.areaLabel, candidate.cityLabel)) ?? 0;
  const availability = candidate.intent === 'SALE' || candidate.isAvailable ? 1 : 0;
  return (
    w.location * locationRelevance(candidate, context) +
    w.propertyTypeInterest * typeInterest +
    w.areaInterest * areaInterest +
    w.quality * qualityScore(candidate) +
    w.freshness * freshnessScore(candidate.publishedAt, context.now) +
    w.availability * availability
  );
}

export function isEligible(candidate: RecommendationCandidate, context: RecommendationContext): boolean {
  if (candidate.intent !== context.intent) return false;
  if (context.explicitCity && normalise(candidate.cityLabel) !== normalise(context.explicitCity)) return false;
  return true;
}

const byScoreThenId = <T extends RecommendationCandidate>(a: ScoredCandidate<T>, b: ScoredCandidate<T>) =>
  b.score - a.score || a.candidate.id.localeCompare(b.candidate.id);

export function diversify<T extends RecommendationCandidate>(
  scored: readonly ScoredCandidate<T>[],
  limit: number,
): ScoredCandidate<T>[] {
  const remaining = [...scored];
  const picked: ScoredCandidate<T>[] = [];
  const propertyCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  while (remaining.length > 0 && picked.length < limit) {
    const adjusted = remaining.map((entry) => {
      const sameProperty = entry.candidate.propertyId ? (propertyCounts.get(entry.candidate.propertyId) ?? 0) : 0;
      const sameArea = areaCounts.get(areaKey(entry.candidate.areaLabel, entry.candidate.cityLabel)) ?? 0;
      const areaExcess = Math.max(0, sameArea - SAME_AREA_ALLOWANCE + 1);
      const penalty = Math.pow(SAME_PROPERTY_PENALTY, sameProperty) * Math.pow(SAME_AREA_PENALTY, areaExcess);
      return { entry, effective: { candidate: entry.candidate, score: entry.score * penalty } };
    });
    adjusted.sort((a, b) => byScoreThenId(a.effective, b.effective));
    const best = adjusted[0]!;
    picked.push(best.entry);
    remaining.splice(remaining.indexOf(best.entry), 1);
    const propertyId = best.entry.candidate.propertyId;
    if (propertyId) propertyCounts.set(propertyId, (propertyCounts.get(propertyId) ?? 0) + 1);
    const key = areaKey(best.entry.candidate.areaLabel, best.entry.candidate.cityLabel);
    areaCounts.set(key, (areaCounts.get(key) ?? 0) + 1);
  }
  return picked;
}

export function rankRecommendations<T extends RecommendationCandidate>(
  candidates: readonly T[],
  context: RecommendationContext,
  limit: number,
): T[] {
  const scored = candidates
    .filter((candidate) => isEligible(candidate, context))
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate, context) }))
    .sort(byScoreThenId);
  return diversify(scored, limit).map((entry) => entry.candidate);
}
