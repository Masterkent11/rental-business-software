import {ApiMarketingAdapter} from "../http/api-marketing.adapter";
import {MarketingUseCases} from "../../application/use-cases/marketing/marketing.use-cases";
import { SupabasePartnerAccessAdapter } from "../auth/supabase-partner-access.adapter";
import { RegisterPartnerUseCase, CompletePartnerSetupUseCase, RequestPartnerPasswordResetUseCase, UpdatePartnerPasswordUseCase } from "../../application/use-cases/session/partner-access.use-cases";
import { HttpClient } from "../http/http-client";
import { ApiOwnerRepositoryAdapter } from "../http/api-owner-repository.adapter";
import { SupabaseSessionAdapter } from "../auth/supabase-session.adapter";
import { SupabaseRealtimeAdapter } from "../realtime/supabase-realtime.adapter";
import { SupabasePhotoStorageAdapter } from "../storage/supabase-photo-storage.adapter";
import { BrowserFileReaderAdapter } from "../storage/browser-file-reader.adapter";
import { ApiPartnerRepositoryAdapter } from "../http/api-partner-repository.adapter";
import type { PartnerRepositoryPort } from "../../application/ports/partner-repository.port";

import type { OwnerRepositoryPort } from "../../application/ports/owner-repository.port";
import type { SessionPort } from "../../application/ports/session.port";
import type { RealtimePort } from "../../application/ports/realtime.port";
import type { PhotoStoragePort } from "../../application/ports/photo-storage.port";

import {
  GetCurrentSessionUseCase,
  SignInUseCase,
  RefreshSessionUseCase,
  SignOutUseCase,
  SwitchWorkspaceUseCase,
  WatchSessionUseCase,
} from "../../application/use-cases/session/session.use-cases";
import {
  CreateSaleListingUseCase,
  LoadPartnerListingUseCase,
  LoadSaleTermsUseCase,
  RemoveFloorPlanUseCase,
  RemovePartnerPhotoUseCase,
  ReorderPartnerPhotosUseCase,
  SaveSaleTermsUseCase,
  UpdateSaleListingUseCase,
  UploadFloorPlanUseCase,
  UploadPartnerPhotoUseCase,
} from "../../application/use-cases/partner/sale-listings.use-cases";
import {
  LoadInquiriesUseCase,
  LoadViewingsUseCase,
  MoveInquiryUseCase,
  ViewingActionUseCase,
} from "../../application/use-cases/partner/engagement.use-cases";
import {
  CreateAgentTaskUseCase,
  EndRepresentationUseCase,
  InviteAgentUseCase,
  LoadAgentClientsUseCase,
  LoadAgentDashboardUseCase,
  LoadAgentProfileUseCase,
  LoadAgentRepresentationsUseCase,
  LoadAgentTasksUseCase,
  LoadAnalyticsUseCase,
  LoadOrganizationRepresentationsUseCase,
  RegisterAgentProfileUseCase,
  RemoveAgentTaskUseCase,
  RequestAgentVerificationUseCase,
  RespondToRepresentationUseCase,
  SearchAgentsUseCase,
  SetAgentTaskDoneUseCase,
  UpdateAgentProfileUseCase,
  UpdateRepresentationPermissionsUseCase,
} from "../../application/use-cases/partner/agents.use-cases";
import {
  AddTourSceneUseCase,
  ConfigureTourProviderUseCase,
  EditTourUseCase,
  LoadTourOverviewUseCase,
  LoadTourUseCase,
  OpenListingTourUseCase,
} from "../../application/use-cases/partner/tours.use-cases";
import { LoadDashboardUseCase } from "../../application/use-cases/dashboard/load-dashboard.use-case";
import {
  BlockDatesUseCase,
  ChangeListingStateUseCase,
  CreatePropertyListingUseCase,
  LoadListingCalendarUseCase,
  LoadListingsUseCase,
  UnblockDatesUseCase,
  UpdateListingUseCase,
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
  WatchActivityUseCase,
  WatchNotificationsUseCase,
} from "../../application/use-cases/notifications/notifications.use-cases";

export class OwnerWebContainer {
  readonly httpClient = new HttpClient();
  readonly partnerAccess = new SupabasePartnerAccessAdapter(this.httpClient);
  readonly registerPartner = new RegisterPartnerUseCase(this.partnerAccess);
  readonly completePartnerSetup = new CompletePartnerSetupUseCase(this.partnerAccess);
  readonly requestPartnerPasswordReset = new RequestPartnerPasswordResetUseCase(this.partnerAccess);
  readonly updatePartnerPassword = new UpdatePartnerPasswordUseCase(this.partnerAccess);
  readonly ownerRepository: OwnerRepositoryPort = new ApiOwnerRepositoryAdapter(this.httpClient);
  readonly sessionPort: SessionPort = new SupabaseSessionAdapter(this.httpClient);
  readonly realtime: RealtimePort = new SupabaseRealtimeAdapter();
  readonly photoStorage: PhotoStoragePort = new SupabasePhotoStorageAdapter();
  readonly partnerRepository: PartnerRepositoryPort = new ApiPartnerRepositoryAdapter(this.httpClient);
  readonly fileReader = new BrowserFileReaderAdapter();
  readonly marketing = new MarketingUseCases(new ApiMarketingAdapter(this.httpClient),this.fileReader);

  readonly getCurrentSessionUseCase = new GetCurrentSessionUseCase(this.sessionPort);
  readonly signInUseCase = new SignInUseCase(this.sessionPort);
  readonly signOutUseCase = new SignOutUseCase(this.sessionPort);
  readonly switchWorkspaceUseCase = new SwitchWorkspaceUseCase(this.sessionPort);
  readonly watchSessionUseCase = new WatchSessionUseCase(this.sessionPort);
  readonly refreshSessionUseCase = new RefreshSessionUseCase(this.sessionPort);

  readonly loadDashboardUseCase = new LoadDashboardUseCase(this.ownerRepository);

  readonly loadListingsUseCase = new LoadListingsUseCase(this.ownerRepository);
  readonly createPropertyListingUseCase = new CreatePropertyListingUseCase(this.ownerRepository);
  readonly updateListingUseCase = new UpdateListingUseCase(this.ownerRepository);
  readonly changeListingStateUseCase = new ChangeListingStateUseCase(this.ownerRepository);
  readonly loadListingCalendarUseCase = new LoadListingCalendarUseCase(this.ownerRepository);
  readonly blockDatesUseCase = new BlockDatesUseCase(this.ownerRepository);
  readonly unblockDatesUseCase = new UnblockDatesUseCase(this.ownerRepository);

  readonly loadBookingsUseCase = new LoadBookingsUseCase(this.ownerRepository);
  readonly loadBookingUseCase = new LoadBookingUseCase(this.ownerRepository);
  readonly updateBookingStatusUseCase = new UpdateBookingStatusUseCase(this.ownerRepository);

  readonly loadConversationsUseCase = new LoadConversationsUseCase(this.partnerRepository);
  readonly loadThreadUseCase = new LoadThreadUseCase(this.partnerRepository);
  readonly sendMessageUseCase = new SendMessageUseCase(this.partnerRepository);
  readonly markConversationReadUseCase = new MarkConversationReadUseCase(this.partnerRepository);
  readonly watchMessagesUseCase = new WatchMessagesUseCase(this.realtime);

  readonly loadNotificationsUseCase = new LoadNotificationsUseCase(this.partnerRepository);
  readonly markNotificationsReadUseCase = new MarkNotificationsReadUseCase(this.partnerRepository);
  readonly watchNotificationsUseCase = new WatchNotificationsUseCase(this.realtime);
  readonly watchActivityUseCase = new WatchActivityUseCase(this.realtime);

  readonly loadPartnerListingUseCase = new LoadPartnerListingUseCase(this.partnerRepository);
  readonly createSaleListingUseCase = new CreateSaleListingUseCase(this.partnerRepository);
  readonly updateSaleListingUseCase = new UpdateSaleListingUseCase(this.partnerRepository);
  readonly loadSaleTermsUseCase = new LoadSaleTermsUseCase(this.partnerRepository);
  readonly saveSaleTermsUseCase = new SaveSaleTermsUseCase(this.partnerRepository);
  readonly uploadPartnerPhotoUseCase = new UploadPartnerPhotoUseCase(this.partnerRepository, this.photoStorage);
  readonly removePartnerPhotoUseCase = new RemovePartnerPhotoUseCase(this.partnerRepository, this.photoStorage);
  readonly reorderPartnerPhotosUseCase = new ReorderPartnerPhotosUseCase(this.partnerRepository);
  readonly uploadFloorPlanUseCase = new UploadFloorPlanUseCase(this.partnerRepository, this.photoStorage);
  readonly removeFloorPlanUseCase = new RemoveFloorPlanUseCase(this.partnerRepository, this.photoStorage);

  readonly loadInquiriesUseCase = new LoadInquiriesUseCase(this.partnerRepository);
  readonly moveInquiryUseCase = new MoveInquiryUseCase(this.partnerRepository);
  readonly loadViewingsUseCase = new LoadViewingsUseCase(this.partnerRepository);
  readonly viewingActionUseCase = new ViewingActionUseCase(this.partnerRepository);

  readonly loadAgentProfileUseCase = new LoadAgentProfileUseCase(this.partnerRepository);
  readonly registerAgentProfileUseCase = new RegisterAgentProfileUseCase(this.partnerRepository);
  readonly updateAgentProfileUseCase = new UpdateAgentProfileUseCase(this.partnerRepository);
  readonly requestAgentVerificationUseCase = new RequestAgentVerificationUseCase(this.partnerRepository);
  readonly loadAgentDashboardUseCase = new LoadAgentDashboardUseCase(this.partnerRepository);
  readonly loadAgentRepresentationsUseCase = new LoadAgentRepresentationsUseCase(this.partnerRepository);
  readonly respondToRepresentationUseCase = new RespondToRepresentationUseCase(this.partnerRepository);
  readonly endRepresentationUseCase = new EndRepresentationUseCase(this.partnerRepository);
  readonly searchAgentsUseCase = new SearchAgentsUseCase(this.partnerRepository);
  readonly loadOrganizationRepresentationsUseCase = new LoadOrganizationRepresentationsUseCase(this.partnerRepository);
  readonly inviteAgentUseCase = new InviteAgentUseCase(this.partnerRepository);
  readonly updateRepresentationPermissionsUseCase = new UpdateRepresentationPermissionsUseCase(this.partnerRepository);
  readonly loadAgentClientsUseCase = new LoadAgentClientsUseCase(this.partnerRepository);
  readonly loadAgentTasksUseCase = new LoadAgentTasksUseCase(this.partnerRepository);
  readonly createAgentTaskUseCase = new CreateAgentTaskUseCase(this.partnerRepository);
  readonly setAgentTaskDoneUseCase = new SetAgentTaskDoneUseCase(this.partnerRepository);
  readonly removeAgentTaskUseCase = new RemoveAgentTaskUseCase(this.partnerRepository);
  readonly loadAnalyticsUseCase = new LoadAnalyticsUseCase(this.partnerRepository);

  readonly loadTourOverviewUseCase = new LoadTourOverviewUseCase(this.partnerRepository);
  readonly openListingTourUseCase = new OpenListingTourUseCase(this.partnerRepository);
  readonly loadTourUseCase = new LoadTourUseCase(this.partnerRepository);
  readonly configureTourProviderUseCase = new ConfigureTourProviderUseCase(this.partnerRepository);
  readonly addTourSceneUseCase = new AddTourSceneUseCase(this.partnerRepository, this.fileReader);
  readonly editTourUseCase = new EditTourUseCase(this.partnerRepository);

  readonly loadApplicationsUseCase = new LoadApplicationsUseCase(this.ownerRepository);
  readonly decideApplicationUseCase = new DecideApplicationUseCase(this.ownerRepository);
}

export const container = new OwnerWebContainer();
