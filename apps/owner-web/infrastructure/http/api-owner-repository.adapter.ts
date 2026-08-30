/**
 * Infrastructure Adapter: ApiOwnerRepositoryAdapter
 *
 * Implements OwnerRepositoryPort.
 * Performs HTTP calls to the NestJS API with Zod validation at boundaries.
 * No silent fallback to mock data on API failures.
 */

import type { OwnerRepositoryPort } from "../../application/ports/owner-repository.port";
import type { Property, CreatePropertyInput } from "../../domain/properties/property";
import type {
  OwnerListing,
  CreateListingInput,
  OrganizationResource,
} from "../../domain/listings/listing";
import type {
  OwnerApplication,
  DecisionInput,
} from "../../domain/applications/application";
import type { Collection } from "../../domain/payments/collection";

import { HttpClient } from "./http-client";
import {
  CreatePropertyInputDtoSchema,
  PropertyResponseDtoSchema,
} from "./dto/property.dto";
import {
  CreateListingInputDtoSchema,
  OwnerListingDtoSchema,
  OrganizationResourceDtoSchema,
} from "./dto/listing.dto";
import {
  DecisionInputDtoSchema,
  OwnerApplicationDtoSchema,
} from "./dto/application.dto";
import { CollectionDtoSchema } from "./dto/collection.dto";

export class ApiOwnerRepositoryAdapter implements OwnerRepositoryPort {
  constructor(private readonly http: HttpClient) {}

  async getProperties(organizationId: string): Promise<readonly Property[]> {
    let list: unknown[] = [];
    try {
      const raw = await this.http.request<{ properties?: unknown[]; items?: unknown[] }>(
        `/organizations/${organizationId}/properties`,
        { organizationId },
      );
      list = raw.properties ?? raw.items ?? [];
    } catch {
      const res = await this.http.request<{ resources: unknown[] }>(
        `/organizations/${organizationId}/resources`,
        { organizationId },
      );
      list = res.resources ?? [];
    }

    return list.map((item: unknown) => {
      const parsed = PropertyResponseDtoSchema.parse(item);
      return {
        id: parsed.id,
        organizationId: parsed.organizationId ?? parsed.organization_id ?? organizationId,
        name: parsed.name,
        areaLabel: parsed.areaLabel ?? parsed.area_label ?? "Cebu City",
        cityLabel: parsed.cityLabel ?? parsed.city_label ?? "Cebu City",
        photo: parsed.photo,
        resourceCount: parsed.resourceCount,
        occupied: parsed.occupied,
        reserved: parsed.reserved,
        vacant: parsed.vacant,
        monthlyPotentialCentavos: parsed.monthlyPotentialCentavos,
        monthlyContractedCentavos: parsed.monthlyContractedCentavos,
      };
    });
  }

  async createProperty(
    organizationId: string,
    input: CreatePropertyInput,
  ): Promise<Property> {
    const validated = CreatePropertyInputDtoSchema.parse(input);
    const res = await this.http.request<unknown>(
      `/organizations/${organizationId}/properties`,
      {
        method: "POST",
        organizationId,
        body: validated,
      },
    );

    const parsed = PropertyResponseDtoSchema.parse(res);
    return {
      id: parsed.id,
      organizationId,
      name: parsed.name,
      areaLabel: parsed.areaLabel ?? parsed.area_label ?? validated.areaLabel,
      cityLabel: parsed.cityLabel ?? parsed.city_label ?? validated.cityLabel,
      photo: parsed.photo,
      resourceCount: parsed.resourceCount,
      occupied: parsed.occupied,
      reserved: parsed.reserved,
      vacant: parsed.vacant,
      monthlyPotentialCentavos: parsed.monthlyPotentialCentavos,
      monthlyContractedCentavos: parsed.monthlyContractedCentavos,
    };
  }

  async getOrganizationResources(
    organizationId: string,
  ): Promise<readonly OrganizationResource[]> {
    const res = await this.http.request<{ resources: unknown[] }>(
      `/organizations/${organizationId}/resources`,
      { organizationId },
    );

    const items = Array.isArray(res.resources) ? res.resources : [];
    return items.map((r) => OrganizationResourceDtoSchema.parse(r));
  }

  async getOrganizationListings(
    organizationId: string,
  ): Promise<readonly OwnerListing[]> {
    const res = await this.http.request<{ items: unknown[]; total?: number }>(
      `/organizations/${organizationId}/listings`,
      { organizationId },
    );

    const items = Array.isArray(res.items) ? res.items : [];
    return items.map((item) => {
      const parsed = OwnerListingDtoSchema.parse(item);
      return {
        id: parsed.id,
        resourceId: parsed.resourceId,
        resourceType: parsed.resourceType,
        propertyName: parsed.propertyName,
        areaLabel: parsed.areaLabel,
        cityLabel: parsed.cityLabel,
        kind: parsed.kind,
        title: parsed.title,
        description: parsed.description,
        state: parsed.state,
        priceCentavos: parsed.priceCentavos,
        currency: parsed.currency,
        photos: parsed.photos,
        amenities: parsed.amenities,
        houseRules: parsed.houseRules,
        terms: parsed.terms,
        minStayNights: parsed.minStayNights ?? null,
        advanceMonths: parsed.advanceMonths,
        depositMonths: parsed.depositMonths,
        availabilityLabel: parsed.availabilityLabel,
        isAvailable: parsed.isAvailable,
        sharedFacilities: parsed.sharedFacilities,
        ownerName: parsed.ownerName,
        ownerVerified: parsed.ownerVerified,
        hasTour: parsed.hasTour,
        sceneCount: parsed.sceneCount,
      };
    });
  }

  async createListing(
    organizationId: string,
    input: CreateListingInput,
  ): Promise<OwnerListing> {
    const validated = CreateListingInputDtoSchema.parse(input);
    const res = await this.http.request<unknown>(
      `/organizations/${organizationId}/listings`,
      {
        method: "POST",
        organizationId,
        body: {
          resourceId: validated.resourceId,
          kind: validated.kind,
          title: validated.title,
          description: validated.description,
          priceCentavos: Math.round(validated.pricePesos * 100),
          amenities: validated.amenities,
          houseRules: validated.houseRules,
          terms: validated.terms,
          minStayNights: validated.minStayNights ?? null,
          advanceMonths: validated.advanceMonths,
          depositMonths: validated.depositMonths,
          photos: validated.photos,
        },
      },
    );

    const parsed = OwnerListingDtoSchema.parse(res);
    return parsed;
  }

  async uploadListingPhoto(
    organizationId: string,
    listingId: string,
    photoBase64: string,
    contentType = "image/jpeg",
  ): Promise<{ listingId: string; photos: string[]; uploadedUrl: string }> {
    return this.http.request<{
      listingId: string;
      photos: string[];
      uploadedUrl: string;
    }>(`/organizations/${organizationId}/listings/${listingId}/photos`, {
      method: "POST",
      organizationId,
      body: { photoBase64, contentType },
    });
  }

  async publishListing(
    organizationId: string,
    listingId: string,
    publish: boolean,
  ): Promise<OwnerListing> {
    const res = await this.http.request<unknown>(
      `/organizations/${organizationId}/listings/${listingId}/publish`,
      {
        method: "POST",
        organizationId,
        body: { publish },
      },
    );
    return OwnerListingDtoSchema.parse(res);
  }

  async getApplications(
    organizationId: string,
  ): Promise<readonly OwnerApplication[]> {
    const res = await this.http.request<{ applications: unknown[] }>(
      `/organizations/${organizationId}/applications`,
      { organizationId },
    );

    const apps = Array.isArray(res.applications) ? res.applications : [];
    return apps.map((app) => OwnerApplicationDtoSchema.parse(app));
  }

  async decideApplication(
    organizationId: string,
    applicationId: string,
    input: DecisionInput,
  ): Promise<{ id: string; state: string; decisionReason: string | null }> {
    const validated = DecisionInputDtoSchema.parse(input);
    return this.http.request<{
      id: string;
      state: string;
      decisionReason: string | null;
    }>(
      `/organizations/${organizationId}/applications/${applicationId}/decision`,
      {
        method: "POST",
        organizationId,
        body: { decision: validated.decision, reason: validated.reason },
      },
    );
  }

  async getCollection(organizationId: string): Promise<Collection> {
    const res = await this.http.request<unknown>(
      `/organizations/${organizationId}/collection`,
      { organizationId },
    );
    return CollectionDtoSchema.parse(res);
  }
}
