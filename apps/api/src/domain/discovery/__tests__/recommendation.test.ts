import { describe, expect, it } from 'vitest';
import {
  EMPTY_INTEREST,
  buildInterestProfile,
  diversify,
  freshnessScore,
  rankRecommendations,
  scoreCandidate,
  type RecommendationCandidate,
  type RecommendationContext,
} from '@/domain/discovery/recommendation.ts';

const now = new Date('2026-10-09T00:00:00Z');

const candidate = (over: Partial<RecommendationCandidate> & Pick<RecommendationCandidate, 'id'>): RecommendationCandidate => ({
  intent: 'RENT',
  propertyId: `property-${over.id}`,
  propertyType: 'CONDO',
  areaLabel: 'Brgy. Lahug',
  cityLabel: 'Cebu City',
  distanceKm: null,
  photoCount: 4,
  hasTour: false,
  descriptionLength: 200,
  hasLocation: true,
  isAvailable: true,
  publishedAt: new Date('2026-10-01T00:00:00Z'),
  ...over,
});

const context = (over: Partial<RecommendationContext> = {}): RecommendationContext => ({
  intent: 'RENT',
  explicitCity: null,
  hasOrigin: false,
  interest: EMPTY_INTEREST,
  now,
  ...over,
});

describe('listing recommendations', () => {
  const davao = candidate({ id: 'davao', cityLabel: 'Davao City', areaLabel: 'Brgy. Bajada', distanceKm: 3 });
  const cebu = candidate({ id: 'cebu', cityLabel: 'Cebu City', distanceKm: 410, hasTour: true });

  it('ranks listings near the customer ahead of distant ones', () => {
    const ranked = rankRecommendations([cebu, davao], context({ hasOrigin: true }), 10);
    expect(ranked.map((c) => c.id)).toEqual(['davao', 'cebu']);
  });

  it('lets an explicitly chosen city override the passive GPS location', () => {
    const ranked = rankRecommendations([cebu, davao], context({ hasOrigin: true, explicitCity: 'cebu city' }), 10);
    expect(ranked.map((c) => c.id)).toEqual(['cebu']);
  });

  it('returns to nearby ranking once the explicit city is cleared', () => {
    const ranked = rankRecommendations([cebu, davao], context({ hasOrigin: true, explicitCity: null }), 10);
    expect(ranked[0]?.id).toBe('davao');
  });

  it('only recommends listings for the requested intent', () => {
    const sale = candidate({ id: 'sale', intent: 'SALE' });
    expect(rankRecommendations([sale, davao], context(), 10).map((c) => c.id)).toEqual(['davao']);
  });

  it('cold start without location prefers complete, fresh, available listings', () => {
    const sparse = candidate({ id: 'sparse', photoCount: 0, descriptionLength: 10, hasLocation: false, publishedAt: new Date('2026-01-01') });
    const complete = candidate({ id: 'complete', photoCount: 5, hasTour: true });
    const taken = candidate({ id: 'taken', photoCount: 5, hasTour: true, isAvailable: false });
    expect(rankRecommendations([sparse, taken, complete], context(), 10).map((c) => c.id)).toEqual(['complete', 'taken', 'sparse']);
  });

  it('weights a viewing request above an inquiry above a save above a view', () => {
    const profile = buildInterestProfile(
      [
        { kind: 'VIEW', intent: 'SALE', propertyType: 'CONDO', areaLabel: 'A', cityLabel: 'X' },
        { kind: 'SAVE', intent: 'SALE', propertyType: 'TOWNHOUSE', areaLabel: 'B', cityLabel: 'X' },
        { kind: 'INQUIRY', intent: 'SALE', propertyType: 'LOT', areaLabel: 'C', cityLabel: 'X' },
        { kind: 'VIEWING_REQUEST', intent: 'SALE', propertyType: 'HOUSE', areaLabel: 'D', cityLabel: 'X' },
      ],
      'SALE',
    );
    const weights = ['CONDO', 'TOWNHOUSE', 'LOT', 'HOUSE'].map((t) => profile.propertyTypes.get(t as never) ?? 0);
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
    expect(weights[3]).toBeGreaterThan(weights[2]!);
  });

  it('uses buy interest to lift matching property types without beating location', () => {
    const interest = buildInterestProfile(
      [{ kind: 'VIEWING_REQUEST', intent: 'SALE', propertyType: 'HOUSE', areaLabel: 'Brgy. Lanang', cityLabel: 'Davao City' }],
      'SALE',
    );
    const nearCondo = candidate({ id: 'near-condo', intent: 'SALE', propertyType: 'CONDO', distanceKm: 1, cityLabel: 'Davao City' });
    const nearHouse = candidate({ id: 'near-house', intent: 'SALE', propertyType: 'HOUSE', distanceKm: 1, cityLabel: 'Davao City' });
    const farHouse = candidate({ id: 'far-house', intent: 'SALE', propertyType: 'HOUSE', distanceKm: 400, cityLabel: 'Cebu City' });
    const ranked = rankRecommendations([nearCondo, farHouse, nearHouse], context({ intent: 'SALE', hasOrigin: true, interest }), 10);
    expect(ranked.map((c) => c.id)).toEqual(['near-house', 'near-condo', 'far-house']);
  });

  it('ignores interest signals from the other intent', () => {
    const profile = buildInterestProfile(
      [{ kind: 'INQUIRY', intent: 'SALE', propertyType: 'HOUSE', areaLabel: 'A', cityLabel: 'X' }],
      'RENT',
    );
    expect(profile.propertyTypes.size).toBe(0);
  });

  it('spreads results across buildings when relevance is equal', () => {
    const sameBuilding = ['a', 'b', 'c'].map((id) => candidate({ id, propertyId: 'tower-1', areaLabel: 'Brgy. Apas' }));
    const other = candidate({ id: 'z', propertyId: 'tower-2', areaLabel: 'Brgy. Lahug', photoCount: 3 });
    const scored = [...sameBuilding, other].map((c) => ({ candidate: c, score: scoreCandidate(c, context()) }));
    const order = diversify(scored, 4).map((entry) => entry.candidate.id);
    expect(order.indexOf('z')).toBeLessThan(3);
  });

  it('is deterministic for ties', () => {
    const a = candidate({ id: 'a' });
    const b = candidate({ id: 'b' });
    expect(rankRecommendations([b, a], context(), 10).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('decays freshness by half every thirty days', () => {
    expect(freshnessScore(new Date('2026-09-09T00:00:00Z'), now)).toBeCloseTo(0.5, 2);
    expect(freshnessScore(null, now)).toBe(0);
  });
});
