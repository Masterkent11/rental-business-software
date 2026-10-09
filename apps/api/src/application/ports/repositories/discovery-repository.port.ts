import type { InterestSignal } from '@/domain/discovery/recommendation.ts';
import type { ListingIntent } from '@/domain/listings/listing-state.ts';
import type { Coordinates } from '@/domain/shared/geo.ts';

export interface LocationSuggestion {
  readonly cityLabel: string;
  readonly areaLabel: string | null;
  readonly listingCount: number;
}

export interface ListingSuggestion {
  readonly id: string;
  readonly title: string;
  readonly intent: ListingIntent;
  readonly areaLabel: string;
  readonly cityLabel: string;
}

export interface PopularArea {
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly listingCount: number;
  readonly coverPhotoUrl: string | null;
}

export interface ResolvedPlace {
  readonly cityLabel: string;
  readonly distanceKm: number;
}

export interface PopularAreaQuery {
  readonly intent: ListingIntent | null;
  readonly city: string | null;
  readonly limit: number;
}

export interface DiscoveryRepository {
  suggestLocations(text: string, intent: ListingIntent | null, limit: number): Promise<LocationSuggestion[]>;
  suggestListings(text: string, intent: ListingIntent | null, limit: number): Promise<ListingSuggestion[]>;
  popularAreas(query: PopularAreaQuery): Promise<PopularArea[]>;
  nearestCity(origin: Coordinates, maxDistanceKm: number): Promise<ResolvedPlace | null>;
  interestSignals(userId: string, since: Date): Promise<InterestSignal[]>;
  recordListingView(userId: string, listingId: string): Promise<boolean>;
}
