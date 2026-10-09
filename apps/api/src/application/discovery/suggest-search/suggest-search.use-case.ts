import type {
  DiscoveryRepository,
  ListingSuggestion,
  LocationSuggestion,
} from '@/application/ports/repositories/discovery-repository.port.ts';
import { matchCategories, type CategoryMatch } from '@/domain/discovery/categories.ts';
import type { ListingIntent } from '@/domain/listings/listing-state.ts';

export interface SearchSuggestions {
  readonly locations: readonly LocationSuggestion[];
  readonly listings: readonly ListingSuggestion[];
  readonly categories: readonly CategoryMatch[];
}

export const MIN_SUGGESTION_LENGTH = 2;

export const suggestSearch =
  (discovery: DiscoveryRepository) =>
  async (input: { readonly text: string; readonly intent: ListingIntent | null }): Promise<SearchSuggestions> => {
    const text = input.text.trim();
    if (text.length < MIN_SUGGESTION_LENGTH) return { locations: [], listings: [], categories: [] };
    const [locations, listings] = await Promise.all([
      discovery.suggestLocations(text, input.intent, 6),
      discovery.suggestListings(text, input.intent, 5),
    ]);
    return { locations, listings, categories: matchCategories(text) };
  };
