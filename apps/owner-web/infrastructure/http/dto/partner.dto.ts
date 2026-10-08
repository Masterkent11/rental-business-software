import { z } from "zod";
import { PermissionsDtoSchema } from "./owner.dto";

const inquiryStatus = z.enum(["NEW", "CONTACTED", "QUALIFIED", "VIEWING_SCHEDULED", "NEGOTIATING", "CLOSED", "LOST"]);
const verificationState = z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]);

export const InquiryDtoSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  listingTitle: z.string(),
  listingPhoto: z.string().nullable(),
  areaLabel: z.string(),
  cityLabel: z.string(),
  organizationName: z.string(),
  agentId: z.string().nullable(),
  agentName: z.string().nullable(),
  conversationId: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  message: z.string(),
  questions: z.array(z.string()),
  buyerBudgetCentavos: z.number().nullable(),
  status: inquiryStatus,
  lostReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  firstResponseAt: z.string().nullable(),
});

export const ViewingDtoSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  listingTitle: z.string(),
  listingPhoto: z.string().nullable(),
  areaLabel: z.string(),
  cityLabel: z.string(),
  organizationName: z.string(),
  agentName: z.string().nullable(),
  inquiryId: z.string().nullable(),
  conversationId: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  scheduledAt: z.string(),
  durationMinutes: z.number(),
  status: z.enum(["REQUESTED", "CONFIRMED", "RESCHEDULE_REQUESTED", "COMPLETED", "CANCELLED"]),
  customerNote: z.string(),
  partnerNote: z.string(),
  cancelledByRole: z.string().nullable(),
});

export const PublicAgentDtoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  headline: z.string(),
  photoUrl: z.string().nullable(),
  verified: z.boolean(),
  specialties: z.array(z.string()),
  areasServed: z.array(z.string()),
});

export const AgentProfileDtoSchema = PublicAgentDtoSchema.extend({
  bio: z.string(),
  languages: z.array(z.string()),
  licenseNumber: z.string().nullable(),
  licenseAuthority: z.string().nullable(),
  verificationState,
  publicState: z.enum(["PUBLIC", "HIDDEN"]),
});

export const RepresentationDtoSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  listingId: z.string(),
  listingTitle: z.string(),
  listingIntent: z.enum(["RENT", "SALE"]),
  listingState: z.string(),
  listingPhoto: z.string().nullable(),
  areaLabel: z.string(),
  cityLabel: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  state: z.enum(["PENDING", "ACTIVE", "ENDED"]),
  permissions: PermissionsDtoSchema,
  invitedAt: z.string(),
  respondedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});

const pipeline = z.object({
  NEW: z.number(),
  CONTACTED: z.number(),
  QUALIFIED: z.number(),
  VIEWING_SCHEDULED: z.number(),
  NEGOTIATING: z.number(),
  CLOSED: z.number(),
  LOST: z.number(),
});

export const AgentDashboardDtoSchema = z.object({
  agent: AgentProfileDtoSchema,
  metrics: z.object({
    newInquiries: z.number(),
    activeClients: z.number(),
    viewingsToday: z.number(),
    followUpsDue: z.number(),
    dealsInProgress: z.number(),
    pendingInvitations: z.number(),
    representedListings: z.number(),
  }),
  response: z.object({
    sampleSize: z.number(),
    respondedWithinDayRate: z.number().nullable(),
    medianResponseMinutes: z.number().nullable(),
  }),
  pipeline,
  today: z.array(
    z.object({
      kind: z.enum(["VIEWING", "FOLLOW_UP"]),
      id: z.string(),
      at: z.string(),
      title: z.string(),
      subtitle: z.string(),
      status: z.string(),
    }),
  ),
  recentInquiries: z.array(
    z.object({
      id: z.string(),
      listingTitle: z.string(),
      customerName: z.string(),
      status: inquiryStatus,
      createdAt: z.string(),
      conversationId: z.string(),
    }),
  ),
});

export const TaskDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  dueAt: z.string(),
  doneAt: z.string().nullable(),
  inquiryId: z.string().nullable(),
  customerName: z.string().nullable(),
  listingTitle: z.string().nullable(),
});

export const ClientDtoSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  openInquiries: z.number(),
  totalInquiries: z.number(),
  upcomingViewings: z.number(),
  lastActivityAt: z.string(),
  latestConversationId: z.string().nullable(),
  latestListingTitle: z.string(),
  latestStatus: inquiryStatus,
});

export const AnalyticsDtoSchema = z.object({
  inquiriesByStatus: pipeline,
  viewingsByStatus: z.object({
    REQUESTED: z.number(),
    CONFIRMED: z.number(),
    RESCHEDULE_REQUESTED: z.number(),
    COMPLETED: z.number(),
    CANCELLED: z.number(),
  }),
  weekly: z.array(z.object({ weekStart: z.string(), inquiries: z.number(), viewings: z.number(), bookings: z.number() })),
  listings: z.array(
    z.object({
      listingId: z.string(),
      title: z.string(),
      intent: z.enum(["RENT", "SALE"]),
      state: z.string(),
      inquiries: z.number(),
      viewings: z.number(),
      bookings: z.number(),
      conversations: z.number(),
    }),
  ),
});

export const SaleTermsDtoSchema = z.object({
  askingPriceInternalCentavos: z.number().nullable(),
  priceNegotiable: z.boolean(),
  commercialNotes: z.string(),
  updatedAt: z.string().nullable(),
});

export const FloorPlanDtoSchema = z.object({
  id: z.string(),
  url: z.string(),
  storagePath: z.string().nullable(),
  position: z.number(),
  label: z.string(),
});

const tourState = z.enum(["DRAFT", "PROCESSING", "READY", "PUBLISHED", "UNPUBLISHED", "FAILED"]);

export const TourSceneDtoSchema = z.object({
  id: z.string(),
  label: z.string(),
  position: z.number(),
  state: z.enum(["UPLOADING", "PROCESSING", "READY", "FAILED"]),
  failureReason: z.string().nullable(),
  initialYaw: z.number().default(0),
  initialPitch: z.number().default(0),
  initialFov: z.number().default(75),
  sourceUrl: z.string().nullable().default(null),
  previewUrl: z.string().nullable().default(null),
  thumbnailUrl: z.string().nullable().default(null),
  hotspots: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["NAVIGATION", "INFO"]),
      yaw: z.number(),
      pitch: z.number(),
      label: z.string(),
      targetSceneId: z.string().nullable(),
    }),
  ),
});

export const StudioTourDtoSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  state: tourState,
  provider: z.enum(["PLATFORM", "MATTERPORT"]).default("PLATFORM"),
  externalModelId: z.string().nullable().default(null),
  embedUrl: z.string().nullable().default(null),
  entrySceneId: z.string().nullable(),
  scenes: z.array(TourSceneDtoSchema),
  publishable: z.boolean().default(false),
  problems: z.string().nullable().default(null),
});

export const TourOverviewDtoSchema = z.object({
  tourId: z.string().nullable(),
  listingId: z.string(),
  listingTitle: z.string(),
  listingIntent: z.enum(["RENT", "SALE"]),
  listingState: z.string(),
  listingPhoto: z.string().nullable(),
  provider: z.enum(["PLATFORM", "MATTERPORT"]),
  state: z.union([tourState, z.literal("NONE")]),
  sceneCount: z.number(),
  thumbnailUrl: z.string().nullable(),
});
