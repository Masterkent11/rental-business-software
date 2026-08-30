import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface UploadOwnerListingPhotoInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly listingId: string;
  readonly photoBase64: string;
  readonly contentType: string;
}

export const uploadListingPhoto =
  (listings: ListingRepository) =>
  async (
    input: UploadOwnerListingPhotoInput,
  ): Promise<{ listingId: string; photos: readonly string[]; uploadedUrl: string } | null> => {
    assertMayManageOrganization(input.principal, input.organizationId);

    const listing = await listings.findById(input.organizationId, input.listingId);
    if (!listing) return null;

    const cleanBase64 = input.photoBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const dataUrl = `data:${input.contentType};base64,${cleanBase64}`;

    await listings.addPhoto(input.organizationId, input.listingId, dataUrl);
    const updated = await listings.findById(input.organizationId, input.listingId);

    return {
      listingId: input.listingId,
      photos: updated?.photos ?? [dataUrl],
      uploadedUrl: dataUrl,
    };
  };
