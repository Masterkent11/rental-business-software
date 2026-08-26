import type { Listing, ListingQuery } from '../../domain/listings/listing.ts';
import type { PublicScope } from '../../domain/shared/organization-scope.ts';

/**
 * A port the application owns and the outside implements.
 *
 * The domain names what it needs; Postgres supplies it. Replacing Supabase is
 * a new class in `adapters/`, not a rewrite — which is the condition ADR-0001
 * accepted the platform on.
 */
export interface ListingRepository {
  /** Published listings only. The marketplace read crosses organizations. */
  search(scope: PublicScope, query: ListingQuery): Promise<readonly Listing[]>;

  /** Returns null for anything not published — absent, not forbidden. */
  findPublicById(scope: PublicScope, id: string): Promise<Listing | null>;
}
