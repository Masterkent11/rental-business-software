import type {
  PopularArea,
  ResolvedPlace,
} from '@/application/ports/repositories/discovery-repository.port.ts';
import type { SearchSuggestions } from '@/application/discovery/suggest-search/suggest-search.use-case.ts';
import type { RecommendListingsResult } from '@/application/discovery/recommend-listings/recommend-listings.use-case.ts';
import { toListingHttpResponse } from '@/modules/listings/mappers/listing-http.mapper.ts';

export const toSuggestionsHttpResponse = (suggestions: SearchSuggestions) => ({
  locations: suggestions.locations.map((l) => ({
    cityLabel: l.cityLabel,
    areaLabel: l.areaLabel,
    listingCount: l.listingCount,
  })),
  listings: suggestions.listings.map((l) => ({
    id: l.id,
    title: l.title,
    intent: l.intent,
    areaLabel: l.areaLabel,
    cityLabel: l.cityLabel,
  })),
  categories: suggestions.categories.map((c) => ({ propertyType: c.propertyType, label: c.label })),
});

export const toPopularAreaHttpResponse = (area: PopularArea) => ({
  areaLabel: area.areaLabel,
  cityLabel: area.cityLabel,
  listingCount: area.listingCount,
  coverPhotoUrl: area.coverPhotoUrl,
});

export const toResolvedPlaceHttpResponse = (place: ResolvedPlace | null) => ({
  place: place ? { cityLabel: place.cityLabel, distanceKm: place.distanceKm } : null,
});

export const toRecommendationsHttpResponse = (result: RecommendListingsResult) => ({
  scope: result.scope,
  items: result.items.map(toListingHttpResponse),
});
