/**
 * Composition Root: OwnerWebContainer
 *
 * The single source of dependency wiring for owner-web.
 *
 * Flow:
 * Infrastructure Adapters -> Application Ports -> Application Use Cases -> Exported Container
 *
 * Rules:
 * - Concrete infrastructure adapters are instantiated HERE, and only here.
 * - Stores import use cases from this container, never concrete adapters.
 */

import { HttpClient } from "../http/http-client";
import { ApiOwnerRepositoryAdapter } from "../http/api-owner-repository.adapter";
import { SupabaseSessionAdapter } from "../auth/supabase-session.adapter";

import type { OwnerRepositoryPort } from "../../application/ports/owner-repository.port";
import type { SessionPort } from "../../application/ports/session.port";

import {
  GetCurrentSessionUseCase,
  SignInUseCase,
  SignOutUseCase,
} from "../../application/use-cases/session/session.use-cases";
import { LoadDashboardUseCase } from "../../application/use-cases/dashboard/load-dashboard.use-case";
import {
  LoadPropertiesUseCase,
  CreatePropertyUseCase,
} from "../../application/use-cases/properties/properties.use-cases";
import {
  LoadListingsUseCase,
  LoadResourcesUseCase,
  CreateListingUseCase,
  TogglePublishListingUseCase,
} from "../../application/use-cases/listings/listings.use-cases";
import {
  LoadApplicationsUseCase,
  DecideApplicationUseCase,
} from "../../application/use-cases/applications/applications.use-cases";

export class OwnerWebContainer {
  // Infrastructure Adapters & Ports
  readonly httpClient: HttpClient;
  readonly ownerRepository: OwnerRepositoryPort;
  readonly sessionPort: SessionPort;

  // Session Use Cases
  readonly getCurrentSessionUseCase: GetCurrentSessionUseCase;
  readonly signInUseCase: SignInUseCase;
  readonly signOutUseCase: SignOutUseCase;

  // Dashboard Use Case
  readonly loadDashboardUseCase: LoadDashboardUseCase;

  // Property Use Cases
  readonly loadPropertiesUseCase: LoadPropertiesUseCase;
  readonly createPropertyUseCase: CreatePropertyUseCase;

  // Listing Use Cases
  readonly loadListingsUseCase: LoadListingsUseCase;
  readonly loadResourcesUseCase: LoadResourcesUseCase;
  readonly createListingUseCase: CreateListingUseCase;
  readonly togglePublishListingUseCase: TogglePublishListingUseCase;

  // Application Use Cases
  readonly loadApplicationsUseCase: LoadApplicationsUseCase;
  readonly decideApplicationUseCase: DecideApplicationUseCase;

  constructor() {
    this.httpClient = new HttpClient();
    this.ownerRepository = new ApiOwnerRepositoryAdapter(this.httpClient);
    this.sessionPort = new SupabaseSessionAdapter();

    this.getCurrentSessionUseCase = new GetCurrentSessionUseCase(this.sessionPort);
    this.signInUseCase = new SignInUseCase(this.sessionPort);
    this.signOutUseCase = new SignOutUseCase(this.sessionPort);

    this.loadDashboardUseCase = new LoadDashboardUseCase(this.ownerRepository);

    this.loadPropertiesUseCase = new LoadPropertiesUseCase(this.ownerRepository);
    this.createPropertyUseCase = new CreatePropertyUseCase(this.ownerRepository);

    this.loadListingsUseCase = new LoadListingsUseCase(this.ownerRepository);
    this.loadResourcesUseCase = new LoadResourcesUseCase(this.ownerRepository);
    this.createListingUseCase = new CreateListingUseCase(this.ownerRepository);
    this.togglePublishListingUseCase = new TogglePublishListingUseCase(
      this.ownerRepository,
    );

    this.loadApplicationsUseCase = new LoadApplicationsUseCase(
      this.ownerRepository,
    );
    this.decideApplicationUseCase = new DecideApplicationUseCase(
      this.ownerRepository,
    );
  }
}

// Singleton composition instance for production runtime
export const container = new OwnerWebContainer();
