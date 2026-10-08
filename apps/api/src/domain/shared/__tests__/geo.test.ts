import { describe, expect, it } from 'vitest';
import {
  InvalidLocationError,
  assertCoordinates,
  boundingBox,
  clampRadiusKm,
  haversineKm,
  publicCoordinates,
  roundDistanceKm,
} from '@/domain/shared/geo.ts';

const itPark = { latitude: 10.3304, longitude: 123.9058 };
const ayala = { latitude: 10.3181, longitude: 123.9050 };

describe('geo', () => {
  it('measures great-circle distance in kilometres', () => {
    expect(haversineKm(itPark, ayala)).toBeGreaterThan(1.2);
    expect(haversineKm(itPark, ayala)).toBeLessThan(1.5);
    expect(haversineKm(itPark, itPark)).toBe(0);
  });

  it('builds a bounding box that contains every point inside the radius', () => {
    const box = boundingBox(itPark, 5);
    expect(box.minLatitude).toBeLessThan(itPark.latitude);
    expect(box.maxLatitude).toBeGreaterThan(itPark.latitude);
    expect(ayala.latitude).toBeGreaterThan(box.minLatitude);
    expect(ayala.longitude).toBeLessThan(box.maxLongitude);
  });

  it('rounds approximate locations to about a kilometre and leaves exact ones alone', () => {
    expect(publicCoordinates({ ...itPark }, 'APPROXIMATE')).toEqual({ latitude: 10.33, longitude: 123.91 });
    expect(publicCoordinates({ ...itPark }, 'EXACT')).toEqual(itPark);
  });

  it('caps the search radius so a client cannot scan the whole country', () => {
    expect(clampRadiusKm(10_000)).toBe(100);
    expect(clampRadiusKm(undefined)).toBe(25);
    expect(clampRadiusKm(0.01)).toBe(0.5);
  });

  it('rejects impossible and null-island coordinates', () => {
    expect(() => assertCoordinates({ latitude: 91, longitude: 0 })).toThrow(InvalidLocationError);
    expect(() => assertCoordinates({ latitude: 0, longitude: 0 })).toThrow(InvalidLocationError);
    expect(assertCoordinates(itPark)).toEqual(itPark);
  });

  it('reports distances at a precision that does not pinpoint a home', () => {
    expect(roundDistanceKm(0.04)).toBe(0.1);
    expect(roundDistanceKm(3.456)).toBe(3.5);
    expect(roundDistanceKm(42.6)).toBe(43);
  });
});
