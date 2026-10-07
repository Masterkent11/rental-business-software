import type { OwnerRepositoryPort } from "../../ports/owner-repository.port";
import type { PhotoStoragePort } from "../../ports/photo-storage.port";
import type {
  CreatePropertyListingInput,
  ListingAction,
  ListingCalendar,
  ListingPhoto,
  OwnerListing,
  UpdateListingInput,
  AvailabilityBlock,
} from "../../../domain/listings/listing";
import { photoProblem } from "../../../domain/listings/listing";

const requireOrganization = (organizationId: string) => {
  if (!organizationId) throw new Error("Organization ID is required");
};

export class LoadListingsUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string): Promise<readonly OwnerListing[]> {
    requireOrganization(organizationId);
    return this.repository.getListings(organizationId);
  }
}

export class LoadListingUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, listingId: string): Promise<OwnerListing> {
    requireOrganization(organizationId);
    return this.repository.getListing(organizationId, listingId);
  }
}

export class CreatePropertyListingUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, input: CreatePropertyListingInput): Promise<OwnerListing> {
    requireOrganization(organizationId);
    if (!input.property.name.trim()) throw new Error("Give the property a name");
    if (!input.listing.title.trim()) throw new Error("Give the listing a title");
    if (input.listing.priceCentavos <= 0) throw new Error("Set a price greater than zero");
    return this.repository.createPropertyListing(organizationId, input);
  }
}

export class UpdateListingUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, listingId: string, input: UpdateListingInput): Promise<OwnerListing> {
    requireOrganization(organizationId);
    return this.repository.updateListing(organizationId, listingId, input);
  }
}

export class ChangeListingStateUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, listingId: string, action: ListingAction): Promise<OwnerListing> {
    requireOrganization(organizationId);
    return this.repository.changeListingState(organizationId, listingId, action);
  }
}

export class UploadListingPhotoUseCase {
  constructor(
    private readonly repository: OwnerRepositoryPort,
    private readonly storage: PhotoStoragePort,
  ) {}
  async execute(
    organizationId: string,
    listingId: string,
    file: File,
    currentCount: number,
    onProgress: (fraction: number) => void,
  ): Promise<ListingPhoto> {
    requireOrganization(organizationId);
    const problem = photoProblem(file, currentCount);
    if (problem) throw new Error(problem);
    const uploaded = await this.storage.upload(organizationId, listingId, file, onProgress);
    try {
      return await this.repository.registerPhoto(organizationId, listingId, uploaded.storagePath);
    } catch (error) {
      await this.storage.remove(uploaded.storagePath).catch(() => undefined);
      throw error;
    }
  }
}

export class RemoveListingPhotoUseCase {
  constructor(
    private readonly repository: OwnerRepositoryPort,
    private readonly storage: PhotoStoragePort,
  ) {}
  async execute(organizationId: string, listingId: string, photoId: string): Promise<void> {
    requireOrganization(organizationId);
    const removed = await this.repository.removePhoto(organizationId, listingId, photoId);
    if (removed.storagePath) await this.storage.remove(removed.storagePath);
  }
}

export class ReorderListingPhotosUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, listingId: string, photoIds: readonly string[]): Promise<OwnerListing> {
    requireOrganization(organizationId);
    return this.repository.reorderPhotos(organizationId, listingId, photoIds);
  }
}

export class LoadListingCalendarUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, listingId: string, from: string, to: string): Promise<ListingCalendar> {
    requireOrganization(organizationId);
    return this.repository.getCalendar(organizationId, listingId, from, to);
  }
}

export class BlockDatesUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(
    organizationId: string,
    listingId: string,
    startsOn: string,
    endsOn: string,
    note: string | null,
  ): Promise<AvailabilityBlock> {
    requireOrganization(organizationId);
    if (!startsOn || !endsOn || endsOn <= startsOn) throw new Error("Choose an end date after the start date");
    return this.repository.addBlock(organizationId, listingId, startsOn, endsOn, note);
  }
}

export class UnblockDatesUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, blockId: string): Promise<void> {
    requireOrganization(organizationId);
    return this.repository.removeBlock(organizationId, blockId);
  }
}
