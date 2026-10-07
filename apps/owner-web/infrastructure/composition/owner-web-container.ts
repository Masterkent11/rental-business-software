import { HttpClient } from "../http/http-client";
import { ApiOwnerRepositoryAdapter } from "../http/api-owner-repository.adapter";
import { SupabaseSessionAdapter } from "../auth/supabase-session.adapter";
import { SupabaseRealtimeAdapter } from "../realtime/supabase-realtime.adapter";
import { SupabasePhotoStorageAdapter } from "../storage/supabase-photo-storage.adapter";

import type { OwnerRepositoryPort } from "../../application/ports/owner-repository.port";
import type { SessionPort } from "../../application/ports/session.port";
import type { RealtimePort } from "../../application/ports/realtime.port";
import type { PhotoStoragePort } from "../../application/ports/photo-storage.port";

import {
  GetCurrentSessionUseCase,
  SignInUseCase,
  SignOutUseCase,
  SwitchOrganizationUseCase,
} from "../../application/use-cases/session/session.use-cases";
import { LoadDashboardUseCase } from "../../application/use-cases/dashboard/load-dashboard.use-case";
import {
  BlockDatesUseCase,
  ChangeListingStateUseCase,
  CreatePropertyListingUseCase,
  LoadListingCalendarUseCase,
  LoadListingUseCase,
  LoadListingsUseCase,
  RemoveListingPhotoUseCase,
  ReorderListingPhotosUseCase,
  UnblockDatesUseCase,
  UpdateListingUseCase,
  UploadListingPhotoUseCase,
} from "../../application/use-cases/listings/listings.use-cases";
import {
  DecideApplicationUseCase,
  LoadApplicationsUseCase,
} from "../../application/use-cases/applications/applications.use-cases";
import {
  LoadBookingUseCase,
  LoadBookingsUseCase,
  UpdateBookingStatusUseCase,
} from "../../application/use-cases/bookings/bookings.use-cases";
import {
  LoadConversationsUseCase,
  LoadThreadUseCase,
  MarkConversationReadUseCase,
  SendMessageUseCase,
  WatchMessagesUseCase,
} from "../../application/use-cases/messaging/messaging.use-cases";
import {
  LoadNotificationsUseCase,
  MarkNotificationsReadUseCase,
  WatchNotificationsUseCase,
} from "../../application/use-cases/notifications/notifications.use-cases";

export class OwnerWebContainer {
  readonly httpClient = new HttpClient();
  readonly ownerRepository: OwnerRepositoryPort = new ApiOwnerRepositoryAdapter(this.httpClient);
  readonly sessionPort: SessionPort = new SupabaseSessionAdapter(this.httpClient);
  readonly realtime: RealtimePort = new SupabaseRealtimeAdapter();
  readonly photoStorage: PhotoStoragePort = new SupabasePhotoStorageAdapter();

  readonly getCurrentSessionUseCase = new GetCurrentSessionUseCase(this.sessionPort);
  readonly signInUseCase = new SignInUseCase(this.sessionPort);
  readonly signOutUseCase = new SignOutUseCase(this.sessionPort);
  readonly switchOrganizationUseCase = new SwitchOrganizationUseCase(this.sessionPort);

  readonly loadDashboardUseCase = new LoadDashboardUseCase(this.ownerRepository);

  readonly loadListingsUseCase = new LoadListingsUseCase(this.ownerRepository);
  readonly loadListingUseCase = new LoadListingUseCase(this.ownerRepository);
  readonly createPropertyListingUseCase = new CreatePropertyListingUseCase(this.ownerRepository);
  readonly updateListingUseCase = new UpdateListingUseCase(this.ownerRepository);
  readonly changeListingStateUseCase = new ChangeListingStateUseCase(this.ownerRepository);
  readonly uploadListingPhotoUseCase = new UploadListingPhotoUseCase(this.ownerRepository, this.photoStorage);
  readonly removeListingPhotoUseCase = new RemoveListingPhotoUseCase(this.ownerRepository, this.photoStorage);
  readonly reorderListingPhotosUseCase = new ReorderListingPhotosUseCase(this.ownerRepository);
  readonly loadListingCalendarUseCase = new LoadListingCalendarUseCase(this.ownerRepository);
  readonly blockDatesUseCase = new BlockDatesUseCase(this.ownerRepository);
  readonly unblockDatesUseCase = new UnblockDatesUseCase(this.ownerRepository);

  readonly loadBookingsUseCase = new LoadBookingsUseCase(this.ownerRepository);
  readonly loadBookingUseCase = new LoadBookingUseCase(this.ownerRepository);
  readonly updateBookingStatusUseCase = new UpdateBookingStatusUseCase(this.ownerRepository);

  readonly loadConversationsUseCase = new LoadConversationsUseCase(this.ownerRepository);
  readonly loadThreadUseCase = new LoadThreadUseCase(this.ownerRepository);
  readonly sendMessageUseCase = new SendMessageUseCase(this.ownerRepository);
  readonly markConversationReadUseCase = new MarkConversationReadUseCase(this.ownerRepository);
  readonly watchMessagesUseCase = new WatchMessagesUseCase(this.realtime);

  readonly loadNotificationsUseCase = new LoadNotificationsUseCase(this.ownerRepository);
  readonly markNotificationsReadUseCase = new MarkNotificationsReadUseCase(this.ownerRepository);
  readonly watchNotificationsUseCase = new WatchNotificationsUseCase(this.realtime);

  readonly loadApplicationsUseCase = new LoadApplicationsUseCase(this.ownerRepository);
  readonly decideApplicationUseCase = new DecideApplicationUseCase(this.ownerRepository);
}

export const container = new OwnerWebContainer();
