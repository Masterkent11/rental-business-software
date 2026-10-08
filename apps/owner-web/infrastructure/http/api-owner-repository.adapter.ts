import type { OwnerRepositoryPort } from "../../application/ports/owner-repository.port";
import type {
  AvailabilityBlock,
  CreatePropertyListingInput,
  ListingAction,
  ListingCalendar,
  OwnerListing,
  UpdateListingInput,
} from "../../domain/listings/listing";
import type { OwnerApplication, DecisionInput } from "../../domain/applications/application";
import type { Collection } from "../../domain/payments/collection";
import type { BookingAction, BookingBucket, BookingPage, OwnerBooking } from "../../domain/bookings/booking";
import { HttpClient } from "./http-client";
import { DecisionInputDtoSchema, OwnerApplicationDtoSchema } from "./dto/application.dto";
import { CollectionDtoSchema } from "./dto/collection.dto";
import {
  BlockDtoSchema,
  CalendarDtoSchema,
  OwnerBookingDtoSchema,
  OwnerListingDtoSchema,
} from "./dto/owner.dto";

const org = (organizationId: string) => `/organizations/${encodeURIComponent(organizationId)}`;

export class ApiOwnerRepositoryAdapter implements OwnerRepositoryPort {
  constructor(private readonly http: HttpClient) {}

  async getListings(organizationId: string): Promise<readonly OwnerListing[]> {
    const res = await this.http.request<{ items: unknown[] }>(`${org(organizationId)}/listings`, { organizationId });
    return (res.items ?? []).map((item) => OwnerListingDtoSchema.parse(item));
  }

  async createPropertyListing(organizationId: string, input: CreatePropertyListingInput): Promise<OwnerListing> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/properties`, {
      method: "POST",
      organizationId,
      body: input,
    });
    return OwnerListingDtoSchema.parse(res);
  }

  async updateListing(organizationId: string, listingId: string, input: UpdateListingInput): Promise<OwnerListing> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/listings/${listingId}`, {
      method: "PATCH",
      organizationId,
      body: input,
    });
    return OwnerListingDtoSchema.parse(res);
  }

  async changeListingState(organizationId: string, listingId: string, action: ListingAction): Promise<OwnerListing> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/listings/${listingId}/state`, {
      method: "POST",
      organizationId,
      body: { action },
    });
    return OwnerListingDtoSchema.parse(res);
  }

  async getCalendar(organizationId: string, listingId: string, from: string, to: string): Promise<ListingCalendar> {
    const res = await this.http.request<unknown>(
      `${org(organizationId)}/listings/${listingId}/calendar?from=${from}&to=${to}`,
      { organizationId },
    );
    return CalendarDtoSchema.parse(res);
  }

  async addBlock(
    organizationId: string,
    listingId: string,
    startsOn: string,
    endsOn: string,
    note: string | null,
  ): Promise<AvailabilityBlock> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/listings/${listingId}/blocks`, {
      method: "POST",
      organizationId,
      body: { startsOn, endsOn, note },
    });
    return BlockDtoSchema.parse(res);
  }

  async removeBlock(organizationId: string, blockId: string): Promise<void> {
    await this.http.request(`${org(organizationId)}/blocks/${blockId}`, { method: "DELETE", organizationId });
  }

  async getBookings(
    organizationId: string,
    query: { bucket?: BookingBucket; q?: string; limit: number; offset: number },
  ): Promise<BookingPage> {
    const params = new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) });
    if (query.bucket) params.set("bucket", query.bucket);
    if (query.q) params.set("q", query.q);
    const res = await this.http.request<{ items: unknown[]; total: number }>(
      `${org(organizationId)}/bookings?${params.toString()}`,
      { organizationId },
    );
    return { items: (res.items ?? []).map((b) => OwnerBookingDtoSchema.parse(b)), total: res.total ?? 0 };
  }

  async getBooking(organizationId: string, bookingId: string): Promise<OwnerBooking> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/bookings/${bookingId}`, { organizationId });
    return OwnerBookingDtoSchema.parse(res);
  }

  async updateBookingStatus(organizationId: string, bookingId: string, action: BookingAction): Promise<OwnerBooking> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/bookings/${bookingId}/status`, {
      method: "POST",
      organizationId,
      body: { action },
    });
    return OwnerBookingDtoSchema.parse(res);
  }

  async getApplications(organizationId: string): Promise<readonly OwnerApplication[]> {
    const res = await this.http.request<{ applications: unknown[] }>(`${org(organizationId)}/applications`, {
      organizationId,
    });
    return (res.applications ?? []).map((app) => OwnerApplicationDtoSchema.parse(app));
  }

  async decideApplication(
    organizationId: string,
    applicationId: string,
    input: DecisionInput,
  ): Promise<{ id: string; state: string; decisionReason: string | null }> {
    const validated = DecisionInputDtoSchema.parse(input);
    return this.http.request(`${org(organizationId)}/applications/${applicationId}/decision`, {
      method: "POST",
      organizationId,
      body: { decision: validated.decision, ...(validated.reason ? { reason: validated.reason } : {}) },
    });
  }

  async getCollection(organizationId: string): Promise<Collection> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/collection`, { organizationId });
    return CollectionDtoSchema.parse(res);
  }
}
