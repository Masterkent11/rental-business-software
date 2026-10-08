import { DomainError } from './domain-error.ts';

export class InvalidLocationError extends DomainError {}

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export type LocationPrivacy = 'EXACT' | 'APPROXIMATE';

export interface BoundingBox {
  readonly minLatitude: number;
  readonly maxLatitude: number;
  readonly minLongitude: number;
  readonly maxLongitude: number;
}

export const EARTH_RADIUS_KM = 6371.0088;
export const MAX_SEARCH_RADIUS_KM = 100;
export const DEFAULT_SEARCH_RADIUS_KM = 25;
export const APPROXIMATE_PRECISION_DECIMALS = 2;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function assertCoordinates(value: Coordinates): Coordinates {
  const { latitude, longitude } = value;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new InvalidLocationError('Latitude must be between -90 and 90');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new InvalidLocationError('Longitude must be between -180 and 180');
  }
  if (latitude === 0 && longitude === 0) {
    throw new InvalidLocationError('Set the property location on the map');
  }
  return { latitude, longitude };
}

export function clampRadiusKm(radiusKm: number | undefined): number {
  if (radiusKm === undefined || !Number.isFinite(radiusKm)) return DEFAULT_SEARCH_RADIUS_KM;
  return Math.min(MAX_SEARCH_RADIUS_KM, Math.max(0.5, radiusKm));
}

export function haversineKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function boundingBox(center: Coordinates, radiusKm: number): BoundingBox {
  const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const cosLat = Math.max(0.01, Math.cos(toRadians(center.latitude)));
  const lngDelta = Math.min(180, latDelta / cosLat);
  return {
    minLatitude: Math.max(-90, center.latitude - latDelta),
    maxLatitude: Math.min(90, center.latitude + latDelta),
    minLongitude: Math.max(-180, center.longitude - lngDelta),
    maxLongitude: Math.min(180, center.longitude + lngDelta),
  };
}

export function publicCoordinates(exact: Coordinates, privacy: LocationPrivacy): Coordinates {
  if (privacy === 'EXACT') return exact;
  const factor = 10 ** APPROXIMATE_PRECISION_DECIMALS;
  return {
    latitude: Math.round(exact.latitude * factor) / factor,
    longitude: Math.round(exact.longitude * factor) / factor,
  };
}

export function roundDistanceKm(distanceKm: number): number {
  if (distanceKm < 1) return Math.max(0.1, Math.round(distanceKm * 10) / 10);
  if (distanceKm < 10) return Math.round(distanceKm * 10) / 10;
  return Math.round(distanceKm);
}
