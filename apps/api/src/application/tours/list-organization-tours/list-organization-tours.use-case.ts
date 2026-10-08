import type {
  TourOverview,
  TourRepository,
} from '@/application/ports/repositories/tour-repository.port.ts';
import type { MediaStorage } from '@/application/ports/storage/media-storage.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface TourOverviewView {
  readonly overview: TourOverview;
  readonly thumbnailUrl: string | null;
}

export const listOrganizationTours =
  (tours: TourRepository, storage: MediaStorage) =>
  async (input: { readonly principal: Principal; readonly organizationId: string }): Promise<readonly TourOverviewView[]> => {
    assertMayAuthorTours(input.principal, input.organizationId);
    const rows = await tours.overviewForOrganization(input.organizationId);
    return Promise.all(
      rows.map(async (overview) => ({
        overview,
        thumbnailUrl: overview.thumbnailPath ? await storage.createReadUrl(overview.thumbnailPath) : null,
      })),
    );
  };
