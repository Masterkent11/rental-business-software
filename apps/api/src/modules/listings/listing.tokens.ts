/**
 * Injection tokens.
 *
 * Explicit tokens rather than type-based injection, for two reasons
 * (ADR-0012): type-based injection needs Nest to reflect over a constructor's
 * parameter types, which is the framework metadata we are keeping out of the
 * application layer — and it requires `emitDecoratorMetadata`, which
 * esbuild-based runners do not emit.
 */
export const LISTING_REPOSITORY = Symbol('ListingRepository');
export const SEARCH_LISTINGS = Symbol('SearchListings');
export const VIEW_LISTING = Symbol('ViewListing');
