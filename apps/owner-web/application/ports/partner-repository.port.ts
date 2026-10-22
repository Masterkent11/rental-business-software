import type { PartnerScope } from "../../domain/workspace/workspace";
import type {
  AgentPermissions,
  CreateSaleListingInput,
  FloorPlan,
  ListingPhoto,
  OwnerListing,
  SaleTerms,
  UpdateSaleListingInput,
} from "../../domain/listings/listing";
import type { Inquiry, InquiryStatus } from "../../domain/inquiries/inquiry";
import type { PartnerViewingAction, Viewing } from "../../domain/viewings/viewing";

export interface ViewingCommand {
  readonly action: PartnerViewingAction;
  readonly scheduledAt: string | null;
  readonly note: string | null;
}
import type { Conversation, Message } from "../../domain/messaging/conversation";
import type { AppNotification } from "../../domain/notifications/notification";
import type { AgentProfile, AgentProfileForm, PublicAgent, Representation } from "../../domain/agents/agent";
import type { AgentClient, AgentDashboard, AgentTask } from "../../domain/agents/dashboard";
import type { PartnerAnalytics } from "../../domain/analytics/analytics";
import type { StudioTour, TourOverview, TourProvider, TourScene } from "../../domain/tours/tour";

export interface PartnerThreadPage {
  readonly conversation: Conversation;
  readonly messages: readonly Message[];
  readonly hasMore: boolean;
}

export interface PartnerRepositoryPort {
  getListing(scope: PartnerScope, listingId: string): Promise<OwnerListing>;
  createSaleListing(organizationId: string, input: CreateSaleListingInput): Promise<OwnerListing>;
  updateSaleListing(scope: PartnerScope, listingId: string, input: UpdateSaleListingInput): Promise<OwnerListing>;
  getSaleTerms(scope: PartnerScope, listingId: string): Promise<SaleTerms>;
  saveSaleTerms(scope: PartnerScope, listingId: string, terms: Omit<SaleTerms, "updatedAt">): Promise<SaleTerms>;
  registerPhoto(scope: PartnerScope, listingId: string, storagePath: string): Promise<ListingPhoto>;
  removePhoto(scope: PartnerScope, listingId: string, photoId: string): Promise<{ storagePath: string | null }>;
  reorderPhotos(scope: PartnerScope, listingId: string, photoIds: readonly string[]): Promise<OwnerListing>;
  registerFloorPlan(scope: PartnerScope, listingId: string, storagePath: string, label: string): Promise<FloorPlan>;
  removeFloorPlan(scope: PartnerScope, listingId: string, floorPlanId: string): Promise<{ storagePath: string | null }>;

  getInquiries(scope: PartnerScope, filters: { status?: InquiryStatus; listingId?: string }): Promise<readonly Inquiry[]>;
  updateInquiryStatus(scope: PartnerScope, inquiryId: string, status: InquiryStatus, lostReason: string | null): Promise<Inquiry>;
  getViewings(scope: PartnerScope, range: { from?: string; to?: string }): Promise<readonly Viewing[]>;
  viewingAction(scope: PartnerScope, viewingId: string, command: ViewingCommand): Promise<Viewing>;

  getConversations(scope: PartnerScope): Promise<{ conversations: readonly Conversation[]; unreadTotal: number }>;
  getThread(scope: PartnerScope, conversationId: string, before?: string): Promise<PartnerThreadPage>;
  sendMessage(scope: PartnerScope, conversationId: string, body: string, clientId: string): Promise<Message>;
  markConversationRead(scope: PartnerScope, conversationId: string): Promise<void>;
  getNotifications(scope: PartnerScope): Promise<{ notifications: readonly AppNotification[]; unreadCount: number }>;
  markNotificationsRead(scope: PartnerScope): Promise<void>;

  searchAgents(organizationId: string, query: { q?: string; area?: string }): Promise<readonly PublicAgent[]>;
  getOrganizationRepresentations(organizationId: string): Promise<readonly Representation[]>;
  inviteAgent(organizationId: string, listingId: string, agentId: string, permissions: Partial<AgentPermissions>): Promise<Representation>;
  endRepresentation(scope: PartnerScope, representationId: string, reason: string | null): Promise<Representation>;
  updateRepresentationPermissions(organizationId: string, representationId: string, permissions: AgentPermissions): Promise<Representation>;
  getAnalytics(scope: PartnerScope): Promise<PartnerAnalytics>;

  getAgentProfile(): Promise<AgentProfile | null>;
  registerAgentProfile(form: AgentProfileForm): Promise<AgentProfile>;
  updateAgentProfile(form: AgentProfileForm): Promise<AgentProfile>;
  requestAgentVerification(): Promise<AgentProfile>;
  getAgentDashboard(): Promise<AgentDashboard>;
  getAgentRepresentations(): Promise<readonly Representation[]>;
  respondToRepresentation(representationId: string, accept: boolean): Promise<Representation>;
  getAgentClients(): Promise<readonly AgentClient[]>;
  getAgentTasks(includeDone: boolean): Promise<readonly AgentTask[]>;
  createAgentTask(input: { title: string; dueAt: string; inquiryId: string | null }): Promise<AgentTask>;
  setAgentTaskDone(taskId: string, done: boolean): Promise<AgentTask>;
  removeAgentTask(taskId: string): Promise<void>;

  getTourOverview(organizationId: string): Promise<readonly TourOverview[]>;
  ensureListingTour(scope: PartnerScope, listingId: string): Promise<StudioTour>;
  getTour(scope: PartnerScope, tourId: string): Promise<StudioTour>;
  configureTourProvider(scope: PartnerScope, tourId: string, provider: TourProvider, matterport: string | null): Promise<void>;
  addTourScene(scope: PartnerScope, tourId: string, label: string, panoramaBase64: string): Promise<TourScene>;
  renameTourScene(scope: PartnerScope, tourId: string, sceneId: string, label: string): Promise<void>;
  removeTourScene(scope: PartnerScope, tourId: string, sceneId: string): Promise<{ storageCleanup: "DONE" | "PENDING" }>;
  reorderTourScenes(scope: PartnerScope, tourId: string, sceneIds: readonly string[]): Promise<void>;
  setTourEntryScene(scope: PartnerScope, tourId: string, sceneId: string): Promise<void>;
  setSceneView(scope: PartnerScope, tourId: string, sceneId: string, view: { yaw: number; pitch: number; fov: number }): Promise<void>;
  addHotspot(
    scope: PartnerScope,
    tourId: string,
    sceneId: string,
    hotspot: { kind: "NAVIGATION" | "INFO"; yaw: number; pitch: number; label: string; targetSceneId: string | null },
  ): Promise<{ id: string }>;
  updateHotspot(
    scope: PartnerScope,
    tourId: string,
    hotspotId: string,
    hotspot: { yaw: number; pitch: number; label: string; targetSceneId: string | null },
  ): Promise<void>;
  removeHotspot(scope: PartnerScope, tourId: string, hotspotId: string): Promise<void>;
  publishTour(scope: PartnerScope, tourId: string): Promise<void>;
  unpublishTour(scope: PartnerScope, tourId: string): Promise<void>;
}
