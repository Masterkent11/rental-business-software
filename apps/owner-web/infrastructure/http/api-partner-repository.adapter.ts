import type { PartnerRepositoryPort, PartnerThreadPage, ViewingCommand } from "../../application/ports/partner-repository.port";
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
import type { Viewing } from "../../domain/viewings/viewing";
import type { Conversation, Message } from "../../domain/messaging/conversation";
import type { AppNotification } from "../../domain/notifications/notification";
import type { AgentProfile, AgentProfileForm, PublicAgent, Representation } from "../../domain/agents/agent";
import type { AgentClient, AgentDashboard, AgentTask } from "../../domain/agents/dashboard";
import type { PartnerAnalytics } from "../../domain/analytics/analytics";
import type { StudioTour, TourOverview, TourProvider, TourScene } from "../../domain/tours/tour";
import { HttpClient, HttpError } from "./http-client";
import {
  ConversationDtoSchema,
  ListingPhotoDtoSchema,
  MessageDtoSchema,
  NotificationDtoSchema,
  OwnerListingDtoSchema,
} from "./dto/owner.dto";
import {
  AgentDashboardDtoSchema,
  AgentProfileDtoSchema,
  AnalyticsDtoSchema,
  ClientDtoSchema,
  FloorPlanDtoSchema,
  InquiryDtoSchema,
  PublicAgentDtoSchema,
  RepresentationDtoSchema,
  SaleTermsDtoSchema,
  StudioTourDtoSchema,
  TaskDtoSchema,
  TourOverviewDtoSchema,
  TourSceneDtoSchema,
  ViewingDtoSchema,
} from "./dto/partner.dto";

const org = (organizationId: string) => `/organizations/${encodeURIComponent(organizationId)}`;
const id = (value: string) => encodeURIComponent(value);

const base = (scope: PartnerScope) => (scope.kind === "OWNER" ? org(scope.organizationId) : "/agent");
const listingPath = (scope: PartnerScope, listingId: string) => `${base(scope)}/listings/${id(listingId)}`;
const tourPath = (scope: PartnerScope, tourId: string) => `${base(scope)}/tours/${id(tourId)}`;
const headerFor = (scope: PartnerScope) => (scope.kind === "OWNER" ? { organizationId: scope.organizationId } : {});

const profileBody = (form: AgentProfileForm) => ({
  displayName: form.displayName.trim(),
  headline: form.headline.trim(),
  bio: form.bio.trim(),
  licenseNumber: form.licenseNumber.trim() || null,
  licenseAuthority: form.licenseAuthority.trim() || null,
  specialties: form.specialties,
  areasServed: form.areasServed,
  languages: form.languages,
  publicState: form.publicState,
  photoUrl: null,
});

export class ApiPartnerRepositoryAdapter implements PartnerRepositoryPort {
  constructor(private readonly http: HttpClient) {}

  private get<T>(scope: PartnerScope, path: string) {
    return this.http.request<T>(path, headerFor(scope));
  }

  private send<T>(scope: PartnerScope | null, path: string, method: string, body?: unknown) {
    return this.http.request<T>(path, {
      method,
      ...(body === undefined ? {} : { body }),
      ...(scope ? headerFor(scope) : {}),
    });
  }

  async getListing(scope: PartnerScope, listingId: string): Promise<OwnerListing> {
    return OwnerListingDtoSchema.parse(await this.get(scope, listingPath(scope, listingId)));
  }

  async createSaleListing(organizationId: string, input: CreateSaleListingInput): Promise<OwnerListing> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/sale-listings`, {
      method: "POST",
      organizationId,
      body: input,
    });
    return OwnerListingDtoSchema.parse(res);
  }

  async updateSaleListing(scope: PartnerScope, listingId: string, input: UpdateSaleListingInput): Promise<OwnerListing> {
    const path = scope.kind === "OWNER" ? `${org(scope.organizationId)}/sale-listings/${id(listingId)}` : `${listingPath(scope, listingId)}/sale`;
    return OwnerListingDtoSchema.parse(await this.send(scope, path, "PATCH", input));
  }

  async getSaleTerms(scope: PartnerScope, listingId: string): Promise<SaleTerms> {
    return SaleTermsDtoSchema.parse(await this.get(scope, `${listingPath(scope, listingId)}/sale-terms`));
  }

  async saveSaleTerms(scope: PartnerScope, listingId: string, terms: Omit<SaleTerms, "updatedAt">): Promise<SaleTerms> {
    return SaleTermsDtoSchema.parse(await this.send(scope, `${listingPath(scope, listingId)}/sale-terms`, "PUT", terms));
  }

  async registerPhoto(scope: PartnerScope, listingId: string, storagePath: string): Promise<ListingPhoto> {
    return ListingPhotoDtoSchema.parse(await this.send(scope, `${listingPath(scope, listingId)}/photos`, "POST", { storagePath }));
  }

  async removePhoto(scope: PartnerScope, listingId: string, photoId: string): Promise<{ storagePath: string | null }> {
    return this.send(scope, `${listingPath(scope, listingId)}/photos/${id(photoId)}`, "DELETE");
  }

  async reorderPhotos(scope: PartnerScope, listingId: string, photoIds: readonly string[]): Promise<OwnerListing> {
    return OwnerListingDtoSchema.parse(await this.send(scope, `${listingPath(scope, listingId)}/photos/order`, "PUT", { photoIds }));
  }

  async registerFloorPlan(scope: PartnerScope, listingId: string, storagePath: string, label: string): Promise<FloorPlan> {
    return FloorPlanDtoSchema.parse(
      await this.send(scope, `${listingPath(scope, listingId)}/floor-plans`, "POST", { storagePath, label }),
    );
  }

  async removeFloorPlan(scope: PartnerScope, listingId: string, floorPlanId: string): Promise<{ storagePath: string | null }> {
    return this.send(scope, `${listingPath(scope, listingId)}/floor-plans/${id(floorPlanId)}`, "DELETE");
  }

  async getInquiries(scope: PartnerScope, filters: { status?: InquiryStatus; listingId?: string }): Promise<readonly Inquiry[]> {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.listingId) params.set("listingId", filters.listingId);
    const query = params.toString();
    const res = await this.get<{ items: unknown[] }>(scope, `${base(scope)}/inquiries${query ? `?${query}` : ""}`);
    return (res.items ?? []).map((item) => InquiryDtoSchema.parse(item));
  }

  async updateInquiryStatus(scope: PartnerScope, inquiryId: string, status: InquiryStatus, lostReason: string | null): Promise<Inquiry> {
    return InquiryDtoSchema.parse(
      await this.send(scope, `${base(scope)}/inquiries/${id(inquiryId)}/status`, "PATCH", { status, lostReason }),
    );
  }

  async getViewings(scope: PartnerScope, range: { from?: string; to?: string }): Promise<readonly Viewing[]> {
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    const query = params.toString();
    const res = await this.get<{ items: unknown[] }>(scope, `${base(scope)}/viewings${query ? `?${query}` : ""}`);
    return (res.items ?? []).map((item) => ViewingDtoSchema.parse(item));
  }

  async viewingAction(scope: PartnerScope, viewingId: string, command: ViewingCommand): Promise<Viewing> {
    return ViewingDtoSchema.parse(
      await this.send(scope, `${base(scope)}/viewings/${id(viewingId)}/action`, "POST", {
        action: command.action,
        scheduledAt: command.scheduledAt,
        note: command.note,
      }),
    );
  }

  async getConversations(scope: PartnerScope): Promise<{ conversations: readonly Conversation[]; unreadTotal: number }> {
    const res = await this.get<{ conversations: unknown[]; unreadTotal: number }>(scope, `${base(scope)}/conversations`);
    return {
      conversations: (res.conversations ?? []).map((c) => ConversationDtoSchema.parse(c)),
      unreadTotal: res.unreadTotal ?? 0,
    };
  }

  async getThread(scope: PartnerScope, conversationId: string, before?: string): Promise<PartnerThreadPage> {
    const params = new URLSearchParams({ limit: "50" });
    if (before) params.set("before", before);
    const res = await this.get<{ conversation: unknown; messages: unknown[]; hasMore: boolean }>(
      scope,
      `${base(scope)}/conversations/${id(conversationId)}/messages?${params.toString()}`,
    );
    return {
      conversation: ConversationDtoSchema.parse(res.conversation),
      messages: (res.messages ?? []).map((m) => MessageDtoSchema.parse(m)),
      hasMore: res.hasMore === true,
    };
  }

  async sendMessage(scope: PartnerScope, conversationId: string, body: string, clientId: string): Promise<Message> {
    return MessageDtoSchema.parse(
      await this.send(scope, `${base(scope)}/conversations/${id(conversationId)}/messages`, "POST", { body, clientId }),
    );
  }

  async markConversationRead(scope: PartnerScope, conversationId: string): Promise<void> {
    await this.send(scope, `${base(scope)}/conversations/${id(conversationId)}/read`, "POST", {});
  }

  async getNotifications(scope: PartnerScope): Promise<{ notifications: readonly AppNotification[]; unreadCount: number }> {
    const path = scope.kind === "OWNER" ? `${org(scope.organizationId)}/notifications` : "/me/notifications";
    const res = await this.get<{ notifications: unknown[]; unreadCount: number }>(scope, path);
    return {
      notifications: (res.notifications ?? []).map((n) => NotificationDtoSchema.parse(n)),
      unreadCount: res.unreadCount ?? 0,
    };
  }

  async markNotificationsRead(scope: PartnerScope): Promise<void> {
    const path = scope.kind === "OWNER" ? `${org(scope.organizationId)}/notifications/read` : "/me/notifications/read";
    await this.send(scope, path, "POST", { all: true });
  }

  async searchAgents(organizationId: string, query: { q?: string; area?: string }): Promise<readonly PublicAgent[]> {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.area) params.set("area", query.area);
    const res = await this.http.request<{ items: unknown[] }>(`${org(organizationId)}/agents?${params.toString()}`, { organizationId });
    return (res.items ?? []).map((item) => PublicAgentDtoSchema.parse(item));
  }

  async getOrganizationRepresentations(organizationId: string): Promise<readonly Representation[]> {
    const res = await this.http.request<{ items: unknown[] }>(`${org(organizationId)}/representations`, { organizationId });
    return (res.items ?? []).map((item) => RepresentationDtoSchema.parse(item));
  }

  async inviteAgent(
    organizationId: string,
    listingId: string,
    agentId: string,
    permissions: Partial<AgentPermissions>,
  ): Promise<Representation> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/listings/${id(listingId)}/representation`, {
      method: "POST",
      organizationId,
      body: { agentId, permissions },
    });
    return RepresentationDtoSchema.parse(res);
  }

  async endRepresentation(scope: PartnerScope, representationId: string, reason: string | null): Promise<Representation> {
    return RepresentationDtoSchema.parse(
      await this.send(scope, `${base(scope)}/representations/${id(representationId)}/end`, "POST", { reason }),
    );
  }

  async updateRepresentationPermissions(
    organizationId: string,
    representationId: string,
    permissions: AgentPermissions,
  ): Promise<Representation> {
    const res = await this.http.request<unknown>(`${org(organizationId)}/representations/${id(representationId)}/permissions`, {
      method: "PUT",
      organizationId,
      body: permissions,
    });
    return RepresentationDtoSchema.parse(res);
  }

  async getAnalytics(scope: PartnerScope): Promise<PartnerAnalytics> {
    return AnalyticsDtoSchema.parse(await this.get(scope, `${base(scope)}/analytics`));
  }

  async getAgentProfile(): Promise<AgentProfile | null> {
    try {
      return AgentProfileDtoSchema.parse(await this.http.request("/agent/profile"));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  async registerAgentProfile(form: AgentProfileForm): Promise<AgentProfile> {
    return AgentProfileDtoSchema.parse(await this.send(null, "/agent/profile", "POST", profileBody(form)));
  }

  async updateAgentProfile(form: AgentProfileForm): Promise<AgentProfile> {
    return AgentProfileDtoSchema.parse(await this.send(null, "/agent/profile", "PUT", profileBody(form)));
  }

  async requestAgentVerification(): Promise<AgentProfile> {
    return AgentProfileDtoSchema.parse(await this.send(null, "/agent/profile/verification", "POST", {}));
  }

  async getAgentDashboard(): Promise<AgentDashboard> {
    return AgentDashboardDtoSchema.parse(await this.http.request("/agent/dashboard"));
  }

  async getAgentRepresentations(): Promise<readonly Representation[]> {
    const res = await this.http.request<{ items: unknown[] }>("/agent/representations");
    return (res.items ?? []).map((item) => RepresentationDtoSchema.parse(item));
  }

  async respondToRepresentation(representationId: string, accept: boolean): Promise<Representation> {
    return RepresentationDtoSchema.parse(
      await this.send(null, `/agent/representations/${id(representationId)}/respond`, "POST", { accept }),
    );
  }

  async getAgentClients(): Promise<readonly AgentClient[]> {
    const res = await this.http.request<{ items: unknown[] }>("/agent/clients");
    return (res.items ?? []).map((item) => ClientDtoSchema.parse(item));
  }

  async getAgentTasks(includeDone: boolean): Promise<readonly AgentTask[]> {
    const res = await this.http.request<{ items: unknown[] }>(`/agent/tasks?includeDone=${includeDone}`);
    return (res.items ?? []).map((item) => TaskDtoSchema.parse(item));
  }

  async createAgentTask(input: { title: string; dueAt: string; inquiryId: string | null }): Promise<AgentTask> {
    return TaskDtoSchema.parse(await this.send(null, "/agent/tasks", "POST", input));
  }

  async setAgentTaskDone(taskId: string, done: boolean): Promise<AgentTask> {
    return TaskDtoSchema.parse(await this.send(null, `/agent/tasks/${id(taskId)}`, "PATCH", { done }));
  }

  async removeAgentTask(taskId: string): Promise<void> {
    await this.send(null, `/agent/tasks/${id(taskId)}`, "DELETE");
  }

  async getTourOverview(organizationId: string): Promise<readonly TourOverview[]> {
    const res = await this.http.request<{ items: unknown[] }>(`${org(organizationId)}/tours`, { organizationId });
    return (res.items ?? []).map((item) => TourOverviewDtoSchema.parse(item));
  }

  async ensureListingTour(scope: PartnerScope, listingId: string): Promise<StudioTour> {
    return StudioTourDtoSchema.parse(await this.send(scope, `${listingPath(scope, listingId)}/tour`, "POST", {}));
  }

  async getTour(scope: PartnerScope, tourId: string): Promise<StudioTour> {
    return StudioTourDtoSchema.parse(await this.get(scope, tourPath(scope, tourId)));
  }

  async configureTourProvider(scope: PartnerScope, tourId: string, provider: TourProvider, matterport: string | null): Promise<void> {
    await this.send(scope, `${tourPath(scope, tourId)}/provider`, "PUT", { provider, matterport });
  }

  async addTourScene(scope: PartnerScope, tourId: string, label: string, panoramaBase64: string): Promise<TourScene> {
    return TourSceneDtoSchema.parse(await this.send(scope, `${tourPath(scope, tourId)}/scenes`, "POST", { label, panoramaBase64 }));
  }

  async renameTourScene(scope: PartnerScope, tourId: string, sceneId: string, label: string): Promise<void> {
    await this.send(scope, `${tourPath(scope, tourId)}/scenes/${id(sceneId)}`, "PUT", { label });
  }

  async removeTourScene(scope: PartnerScope, tourId: string, sceneId: string): Promise<{ storageCleanup: "DONE" | "PENDING" }> {
    return this.send(scope, `${tourPath(scope, tourId)}/scenes/${id(sceneId)}`, "DELETE");
  }

  async reorderTourScenes(scope: PartnerScope, tourId: string, sceneIds: readonly string[]): Promise<void> {
    await this.send(scope, `${tourPath(scope, tourId)}/scenes/order`, "PUT", { sceneIds });
  }

  async setTourEntryScene(scope: PartnerScope, tourId: string, sceneId: string): Promise<void> {
    await this.send(scope, `${tourPath(scope, tourId)}/entry`, "PUT", { sceneId });
  }

  async setSceneView(scope: PartnerScope, tourId: string, sceneId: string, view: { yaw: number; pitch: number; fov: number }): Promise<void> {
    await this.send(scope, `${tourPath(scope, tourId)}/scenes/${id(sceneId)}/view`, "PUT", view);
  }

  async addHotspot(
    scope: PartnerScope,
    tourId: string,
    sceneId: string,
    hotspot: { kind: "NAVIGATION" | "INFO"; yaw: number; pitch: number; label: string; targetSceneId: string | null },
  ): Promise<{ id: string }> {
    return this.send(scope, `${tourPath(scope, tourId)}/scenes/${id(sceneId)}/hotspots`, "POST", hotspot);
  }

  async updateHotspot(
    scope: PartnerScope,
    tourId: string,
    hotspotId: string,
    hotspot: { yaw: number; pitch: number; label: string; targetSceneId: string | null },
  ): Promise<void> {
    await this.send(scope, `${tourPath(scope, tourId)}/hotspots/${id(hotspotId)}`, "PATCH", hotspot);
  }

  async removeHotspot(scope: PartnerScope, tourId: string, hotspotId: string): Promise<void> {
    await this.send(scope, `${tourPath(scope, tourId)}/hotspots/${id(hotspotId)}`, "DELETE");
  }

  async publishTour(scope: PartnerScope, tourId: string): Promise<void> {
    await this.send(scope, `${tourPath(scope, tourId)}/publish`, "POST", {});
  }

  async unpublishTour(scope: PartnerScope, tourId: string): Promise<void> {
    await this.send(scope, `${tourPath(scope, tourId)}/unpublish`, "POST", {});
  }
}
