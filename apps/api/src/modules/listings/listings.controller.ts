import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import type { Listing } from '../../domain/listings/listing.ts';
import { centavos } from '../../domain/shared/money.ts';
import { moveInCostFor } from '../../domain/listings/move-in-cost.ts';
import { SEARCH_LISTINGS, VIEW_LISTING } from './listing.tokens.ts';
import type { searchListings, viewListing } from '../../features/search-listings/search-listings.ts';

/**
 * Presentation.
 *
 * Nest decorators live here and nowhere deeper. The controller validates at the
 * edge, calls a plain function it was handed, and formats the response — it
 * holds no rule of its own.
 */

const querySchema = z.object({
  q: z.string().trim().min(1).optional(),
  // Comma-separated ids, capped at the page size so one request cannot ask for
  // an unbounded set.
  ids: z
    .string()
    .transform((raw) => raw.split(',').map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(z.guid()).min(1).max(50))
    .optional(),
  kind: z.enum(['LONG_TERM', 'SHORT_TERM']).optional(),
  type: z.enum(['UNIT', 'ROOM', 'BED_SPACE', 'PARKING', 'STORAGE']).optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  hasTour: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * The wire shape.
 *
 * `priceCentavos` stays an integer across the wire (P-06) — a JSON number of
 * pesos would reintroduce the float the rule exists to prevent.
 *
 * `availabilityLabel` is server-decided copy. The client renders it and never
 * derives it: occupancy has one source of truth (U-01), and a client computing
 * "Available now" would be a second one.
 */
const toResponse = (listing: Listing) => ({
  id: listing.id,
  // The availability calendar is keyed by resource, not by listing: a hybrid
  // unit has two listings over one timeline, and both must show the same
  // blocked nights.
  resourceId: listing.resourceId,
  title: listing.title,
  description: listing.description,
  propertyName: listing.propertyName,
  areaLabel: listing.areaLabel,
  cityLabel: listing.cityLabel,
  kind: listing.kind,
  resourceType: listing.resourceType,
  priceCentavos: listing.priceCentavos,
  currency: 'PHP',
  hasTour: listing.hasTour,
  sceneCount: listing.sceneCount,
  photos: listing.photos,
  // Sprint 3 replaces this with the real occupancy projection. Until then it is
  // honest about being a placeholder rather than inventing a date.
  availabilityLabel: 'Available now',
  isAvailable: true,
  amenities: listing.amenities,
  houseRules: listing.houseRules,
  terms: listing.terms,
  minStayNights: listing.minStayNights,
  sharedFacilities: listing.sharedFacilities,
  ownerName: listing.ownerName,
  ownerVerified: listing.ownerVerified,
  // Computed in the domain, never by a client (P-06 and the guardrail that
  // business rules stay in the backend).
  moveInCost: moveInCostFor(listing),
});

@Controller('listings')
export class ListingsController {
  constructor(
    @Inject(SEARCH_LISTINGS)
    private readonly search: ReturnType<typeof searchListings>,
    @Inject(VIEW_LISTING)
    private readonly view: ReturnType<typeof viewListing>,
  ) {}

  @Get()
  async list(@Query() rawQuery: unknown) {
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return { statusCode: 400, title: 'Invalid query', errors: parsed.error.issues };
    }

    const q = parsed.data;
    const results = await this.search({
      ...(q.q !== undefined ? { text: q.q } : {}),
      ...(q.ids !== undefined ? { ids: q.ids } : {}),
      ...(q.kind !== undefined ? { kind: q.kind } : {}),
      ...(q.type !== undefined ? { resourceType: q.type } : {}),
      ...(q.maxPrice !== undefined ? { maxPriceCentavos: centavos(q.maxPrice) } : {}),
      ...(q.hasTour !== undefined ? { hasTour: q.hasTour } : {}),
      limit: q.limit,
      offset: q.offset,
    });

    return { items: results.map(toResponse), limit: q.limit, offset: q.offset };
  }

  @Get(':id')
  async byId(@Param('id') id: string) {
    // z.guid(), not z.uuid(): Zod's `uuid` enforces RFC 4122 version and
    // variant bits, but PostgreSQL's `uuid` type accepts any 128-bit hex value
    // and will happily store one. Validating more strictly than the database
    // means 404ing rows that exist.
    const parsed = z.guid().safeParse(id);
    if (!parsed.success) throw new NotFoundException('Listing not found');

    const listing = await this.view(parsed.data);
    // An unpublished listing is absent, not forbidden — a 403 would confirm a
    // draft the customer should not know exists.
    if (!listing) throw new NotFoundException('Listing not found');
    return toResponse(listing);
  }
}
