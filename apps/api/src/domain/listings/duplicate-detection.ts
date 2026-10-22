import { haversineKm, type Coordinates } from '@/domain/shared/geo.ts';

export interface CanonicalPropertyFacts {
  readonly name: string;
  readonly addressLine: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly propertyType: string;
  readonly location: Coordinates | null;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly floorAreaSqm: number | null;
  readonly lotAreaSqm: number | null;
}

export interface DuplicateCandidate extends CanonicalPropertyFacts {
  readonly listingId: string;
  readonly organizationId: string;
}

export type DuplicateAssessment =
  | { readonly kind: 'DISTINCT' }
  | { readonly kind: 'STRONG'; readonly listingId: string }
  | { readonly kind: 'POSSIBLE'; readonly listingId: string };

export const DUPLICATE_SEARCH_RADIUS_METERS = 150;
export const STRONG_MATCH_DISTANCE_METERS = 60;
export const POSSIBLE_MATCH_DISTANCE_METERS = 25;
export const ADDRESS_SIMILARITY_THRESHOLD = 0.8;
export const AREA_TOLERANCE_RATIO = 0.05;

const ABBREVIATIONS: Readonly<Record<string, string>> = {
  st: 'street',
  str: 'street',
  ave: 'avenue',
  av: 'avenue',
  rd: 'road',
  dr: 'drive',
  ln: 'lane',
  cor: 'corner',
  ext: 'extension',
  hts: 'heights',
  blvd: 'boulevard',
  hwy: 'highway',
  brgy: 'barangay',
  bgy: 'barangay',
  subd: 'subdivision',
  vill: 'village',
  blk: 'block',
  bk: 'block',
  lt: 'lot',
  ph: 'phase',
  bldg: 'building',
  twr: 'tower',
  no: 'number',
};

const UNIT_MARKERS = ['unit', 'lot', 'block', 'phase', 'tower', 'building', 'floor'] as const;

const tokensOf = (value: string): readonly string[] =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/#/g, ' unit ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => ABBREVIATIONS[token] ?? token);

export function normalizeAddress(value: string): string {
  return tokensOf(value).join(' ');
}

export function unitDesignators(value: string): Readonly<Record<string, string>> {
  const tokens = tokensOf(value);
  const found: Record<string, string> = {};
  tokens.forEach((token, index) => {
    const next = tokens[index + 1];
    if ((UNIT_MARKERS as readonly string[]).includes(token) && next && /\d/.test(next)) found[token] = next;
  });
  return found;
}

const designatorsConflict = (a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean =>
  Object.keys(a).some((key) => key in b && a[key] !== b[key]);

const designatorsEqual = (a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
};

export function addressSimilarity(a: string, b: string): number {
  const left = new Set(tokensOf(a));
  const right = new Set(tokensOf(b));
  if (left.size === 0 || right.size === 0) return 0;
  const shared = [...left].filter((token) => right.has(token)).length;
  return shared / (left.size + right.size - shared);
}

const areaCompatible = (a: number | null, b: number | null): boolean =>
  a === null || b === null || Math.abs(a - b) <= Math.max(a, b) * AREA_TOLERANCE_RATIO;

const characteristicsCompatible = (a: CanonicalPropertyFacts, b: CanonicalPropertyFacts): boolean =>
  a.propertyType === b.propertyType &&
  a.bedrooms === b.bedrooms &&
  a.bathrooms === b.bathrooms &&
  areaCompatible(a.floorAreaSqm, b.floorAreaSqm) &&
  areaCompatible(a.lotAreaSqm, b.lotAreaSqm);

const distanceMeters = (a: Coordinates | null, b: Coordinates | null): number | null =>
  a && b ? haversineKm(a, b) * 1000 : null;

const fullAddress = (facts: CanonicalPropertyFacts): string => `${facts.name} ${facts.addressLine}`;

function assessOne(subject: CanonicalPropertyFacts, candidate: DuplicateCandidate): DuplicateAssessment['kind'] {
  const subjectUnits = unitDesignators(fullAddress(subject));
  const candidateUnits = unitDesignators(fullAddress(candidate));
  if (designatorsConflict(subjectUnits, candidateUnits)) return 'DISTINCT';
  if (!characteristicsCompatible(subject, candidate)) return 'DISTINCT';

  const distance = distanceMeters(subject.location, candidate.location);
  const sameAddress = normalizeAddress(subject.addressLine) === normalizeAddress(candidate.addressLine);
  const sameUnits = designatorsEqual(subjectUnits, candidateUnits);
  const sameArea = normalizeAddress(subject.areaLabel) === normalizeAddress(candidate.areaLabel);

  if (sameAddress && sameUnits && sameArea && (distance === null || distance <= STRONG_MATCH_DISTANCE_METERS)) {
    return 'STRONG';
  }
  const similar = addressSimilarity(fullAddress(subject), fullAddress(candidate)) >= ADDRESS_SIMILARITY_THRESHOLD;
  if (similar || (distance !== null && distance <= POSSIBLE_MATCH_DISTANCE_METERS)) return 'POSSIBLE';
  return 'DISTINCT';
}

export function assessDuplicate(
  subject: CanonicalPropertyFacts,
  candidates: readonly DuplicateCandidate[],
): DuplicateAssessment {
  let possible: string | null = null;
  for (const candidate of [...candidates].sort((a, b) => a.listingId.localeCompare(b.listingId))) {
    const kind = assessOne(subject, candidate);
    if (kind === 'STRONG') return { kind: 'STRONG', listingId: candidate.listingId };
    if (kind === 'POSSIBLE' && possible === null) possible = candidate.listingId;
  }
  return possible ? { kind: 'POSSIBLE', listingId: possible } : { kind: 'DISTINCT' };
}
