export type InquiryStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "VIEWING_SCHEDULED" | "NEGOTIATING" | "CLOSED" | "LOST";

export const PIPELINE: readonly InquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "VIEWING_SCHEDULED",
  "NEGOTIATING",
  "CLOSED",
  "LOST",
];

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  VIEWING_SCHEDULED: "Viewing",
  NEGOTIATING: "Negotiating",
  CLOSED: "Closed",
  LOST: "Lost",
};

export interface Inquiry {
  readonly id: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingPhoto: string | null;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly organizationName: string;
  readonly agentId: string | null;
  readonly agentName: string | null;
  readonly conversationId: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly message: string;
  readonly questions: readonly string[];
  readonly buyerBudgetCentavos: number | null;
  readonly status: InquiryStatus;
  readonly lostReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly firstResponseAt: string | null;
}

export function nextStatuses(current: InquiryStatus): readonly InquiryStatus[] {
  if (current === "CLOSED") return [];
  return PIPELINE.filter((status) => status !== current && status !== "NEW");
}

export const isOpenInquiry = (status: InquiryStatus) => status !== "CLOSED" && status !== "LOST";

export function groupByStatus(inquiries: readonly Inquiry[]): Record<InquiryStatus, Inquiry[]> {
  const groups = Object.fromEntries(PIPELINE.map((status) => [status, [] as Inquiry[]])) as Record<InquiryStatus, Inquiry[]>;
  for (const inquiry of inquiries) groups[inquiry.status].push(inquiry);
  return groups;
}
