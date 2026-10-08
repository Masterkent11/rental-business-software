import type { PartnerRepositoryPort } from "../../ports/partner-repository.port";
import type { PhotoStoragePort } from "../../ports/photo-storage.port";
import type { PartnerScope } from "../../../domain/workspace/workspace";
import {
  floorPlanProblem,
  photoProblem,
  type CreateSaleListingInput,
  type FloorPlan,
  type ListingPhoto,
  type OwnerListing,
  type SaleTerms,
  type UpdateSaleListingInput,
} from "../../../domain/listings/listing";

export class LoadPartnerListingUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, listingId: string): Promise<OwnerListing> {
    return this.repository.getListing(scope, listingId);
  }
}

export class CreateSaleListingUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(organizationId: string, input: CreateSaleListingInput): Promise<OwnerListing> {
    if (!organizationId) throw new Error("Choose an organization first");
    return this.repository.createSaleListing(organizationId, input);
  }
}

export class UpdateSaleListingUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, listingId: string, input: UpdateSaleListingInput): Promise<OwnerListing> {
    return this.repository.updateSaleListing(scope, listingId, input);
  }
}

export class LoadSaleTermsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, listingId: string): Promise<SaleTerms> {
    return this.repository.getSaleTerms(scope, listingId);
  }
}

export class SaveSaleTermsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, listingId: string, terms: Omit<SaleTerms, "updatedAt">): Promise<SaleTerms> {
    if (terms.askingPriceInternalCentavos !== null && terms.askingPriceInternalCentavos <= 0) {
      throw new Error("Enter a positive asking price or leave it empty");
    }
    return this.repository.saveSaleTerms(scope, listingId, terms);
  }
}

export class UploadPartnerPhotoUseCase {
  constructor(
    private readonly repository: PartnerRepositoryPort,
    private readonly storage: PhotoStoragePort,
  ) {}
  async execute(
    scope: PartnerScope,
    organizationId: string,
    listingId: string,
    file: File,
    currentCount: number,
    onProgress: (fraction: number) => void,
  ): Promise<ListingPhoto> {
    const problem = photoProblem(file, currentCount);
    if (problem) throw new Error(problem);
    const uploaded = await this.storage.upload(organizationId, listingId, file, onProgress);
    try {
      return await this.repository.registerPhoto(scope, listingId, uploaded.storagePath);
    } catch (error) {
      await this.storage.remove(uploaded.storagePath).catch(() => undefined);
      throw error;
    }
  }
}

export class RemovePartnerPhotoUseCase {
  constructor(
    private readonly repository: PartnerRepositoryPort,
    private readonly storage: PhotoStoragePort,
  ) {}
  async execute(scope: PartnerScope, listingId: string, photoId: string): Promise<void> {
    const removed = await this.repository.removePhoto(scope, listingId, photoId);
    if (removed.storagePath) await this.storage.remove(removed.storagePath);
  }
}

export class UploadFloorPlanUseCase {
  constructor(
    private readonly repository: PartnerRepositoryPort,
    private readonly storage: PhotoStoragePort,
  ) {}
  async execute(
    scope: PartnerScope,
    organizationId: string,
    listingId: string,
    file: File,
    label: string,
    currentCount: number,
    onProgress: (fraction: number) => void,
  ): Promise<FloorPlan> {
    const problem = floorPlanProblem(file, currentCount, label);
    if (problem) throw new Error(problem);
    const uploaded = await this.storage.upload(organizationId, listingId, file, onProgress);
    try {
      return await this.repository.registerFloorPlan(scope, listingId, uploaded.storagePath, label.trim());
    } catch (error) {
      await this.storage.remove(uploaded.storagePath).catch(() => undefined);
      throw error;
    }
  }
}

export class RemoveFloorPlanUseCase {
  constructor(
    private readonly repository: PartnerRepositoryPort,
    private readonly storage: PhotoStoragePort,
  ) {}
  async execute(scope: PartnerScope, listingId: string, floorPlanId: string): Promise<void> {
    const removed = await this.repository.removeFloorPlan(scope, listingId, floorPlanId);
    if (removed.storagePath) await this.storage.remove(removed.storagePath);
  }
}

export class ReorderPartnerPhotosUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, listingId: string, photoIds: readonly string[]): Promise<OwnerListing> {
    return this.repository.reorderPhotos(scope, listingId, photoIds);
  }
}
