/**
 * PRESENTATION VIEW MODELS AND SAMPLE DATA — NOT DOMAIN MODELS.
 *
 * The domain lives in `docs/03-domain/` and is enforced server-side. This app
 * computes no rule of its own — in particular:
 *
 *   * **Occupancy arrives decided.** There is one occupancy timeline per
 *     resource (U-01) and it is server-side. Occupancy rates here are figures
 *     the server produced, not something the dashboard derives from dates.
 *   * **Collected ≠ claimed.** An invoice is a claim; a payment is money. The
 *     owner's headline question — "who owes me money this month?" — is only
 *     answerable because the two are never conflated.
 *   * **Payment origin is carried, never inferred.** Online means the platform
 *     moved the money. Recorded means staff attest that cash changed hands
 *     (D-09), and no view may present the second as the first.
 */

export type Money = number; // integer centavos

export type Organization = {
  name: string;
  verified: boolean;
  publishDelegation: boolean;
};

export const organization: Organization = {
  name: "Santos Property Holdings",
  verified: true,
  publishDelegation: false,
};

/* ------------------------------------------------------------------ metrics */

export type Metric = {
  label: string;
  value: string;
  sub?: string;
  deltaPct?: number;
  trend: number[];
  tone?: "money" | "ok" | "bad" | "plain";
};

/** Claimed vs received, by month. The gap is the owner's whole problem. */
export const collection = [
  { month: "Mar", claimed: 21_450_000, received: 21_450_000 },
  { month: "Apr", claimed: 21_450_000, received: 19_800_000 },
  { month: "May", claimed: 22_300_000, received: 22_300_000 },
  { month: "Jun", claimed: 23_150_000, received: 21_500_000 },
  { month: "Jul", claimed: 23_150_000, received: 23_150_000 },
  { month: "Aug", claimed: 24_000_000, received: 19_650_000 },
];

export const collectedThisMonth = 19_650_000;
export const claimedThisMonth = 24_000_000;
export const outstandingThisMonth = claimedThisMonth - collectedThisMonth;

/* --------------------------------------------------------------- properties */

export type PropertySummary = {
  id: string;
  name: string;
  areaLabel: string;
  photo: string;
  resourceCount: number;
  occupied: number;
  reserved: number;
  vacant: number;
  monthlyPotential: Money;
  monthlyContracted: Money;
};

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?q=80&w=900&auto=format&fit=crop`;

export const properties: PropertySummary[] = [
  {
    id: "prp-abc",
    name: "ABC Apartment",
    areaLabel: "Brgy. Kamputhaw, Cebu City",
    photo: photo("photo-1560448204-e02f11c3d0e2"),
    resourceCount: 18,
    occupied: 15,
    reserved: 1,
    vacant: 2,
    monthlyPotential: 15_300_000,
    monthlyContracted: 13_600_000,
  },
  {
    id: "prp-villa",
    name: "Villa Boarding House",
    areaLabel: "Brgy. Sambag II, Cebu City",
    photo: photo("photo-1594295800284-990f74bb6928"),
    resourceCount: 24,
    occupied: 21,
    reserved: 2,
    vacant: 1,
    monthlyPotential: 9_600_000,
    monthlyContracted: 8_750_000,
  },
  {
    id: "prp-skyline",
    name: "Skyline Residences",
    areaLabel: "Brgy. Apas, Cebu City",
    photo: photo("photo-1512918728675-ed5a9ecdebfd"),
    resourceCount: 8,
    occupied: 5,
    reserved: 1,
    vacant: 2,
    monthlyPotential: 12_000_000,
    monthlyContracted: 7_500_000,
  },
];

export const totalResources = properties.reduce(
  (n, p) => n + p.resourceCount,
  0,
);
export const totalOccupied = properties.reduce((n, p) => n + p.occupied, 0);
export const occupancyRate = Math.round((totalOccupied / totalResources) * 100);
export const totalVacant = properties.reduce((n, p) => n + p.vacant, 0);

/* -------------------------------------------------------------- applications */

export type Application = {
  id: string;
  reference: string;
  applicant: string;
  resourceLabel: string;
  propertyName: string;
  moveIn: string;
  occupants: number;
  documents: number;
  submittedAt: string;
  state: "SUBMITTED" | "APPROVED" | "REJECTED";
};

export const applications: Application[] = [
  {
    id: "app-311",
    reference: "AP-311",
    applicant: "Ana Reyes",
    resourceLabel: "Unit 203",
    propertyName: "ABC Apartment",
    moveIn: "2026-09-01",
    occupants: 2,
    documents: 3,
    submittedAt: "2026-08-18T09:12:00+08:00",
    state: "SUBMITTED",
  },
  {
    id: "app-310",
    reference: "AP-310",
    applicant: "Joel Mercado",
    resourceLabel: "Unit 203",
    propertyName: "ABC Apartment",
    moveIn: "2026-09-15",
    occupants: 1,
    documents: 2,
    submittedAt: "2026-08-17T20:40:00+08:00",
    state: "SUBMITTED",
  },
  {
    id: "app-308",
    reference: "AP-308",
    applicant: "Rina Alonzo",
    resourceLabel: "Bed A, Room 101",
    propertyName: "Villa Boarding House",
    moveIn: "2026-09-01",
    occupants: 1,
    documents: 3,
    submittedAt: "2026-08-16T11:05:00+08:00",
    state: "SUBMITTED",
  },
  {
    id: "app-305",
    reference: "AP-305",
    applicant: "Dennis Uy",
    resourceLabel: "Condo 101",
    propertyName: "Skyline Residences",
    moveIn: "2026-10-01",
    occupants: 2,
    documents: 3,
    submittedAt: "2026-08-11T15:22:00+08:00",
    state: "APPROVED",
  },
];

export const pendingApplications = applications.filter(
  (a) => a.state === "SUBMITTED",
);

/* ------------------------------------------------------------------ arrears */

export type Arrear = {
  id: string;
  tenant: string;
  resourceLabel: string;
  propertyName: string;
  owedCentavos: Money;
  daysOverdue: number;
  lastContact?: string;
};

export const arrears: Arrear[] = [
  {
    id: "ar-1",
    tenant: "Ana Reyes",
    resourceLabel: "Unit 203",
    propertyName: "ABC Apartment",
    owedCentavos: 350_000,
    daysOverdue: 15,
    lastContact: "2026-08-16",
  },
  {
    id: "ar-2",
    tenant: "Marisol Cruz",
    resourceLabel: "Unit 305",
    propertyName: "ABC Apartment",
    owedCentavos: 900_000,
    daysOverdue: 15,
  },
  {
    id: "ar-3",
    tenant: "Kevin Tan",
    resourceLabel: "Room 102",
    propertyName: "Villa Boarding House",
    owedCentavos: 600_000,
    daysOverdue: 9,
    lastContact: "2026-08-18",
  },
  {
    id: "ar-4",
    tenant: "Grace Lim",
    resourceLabel: "Bed C, Room 204",
    propertyName: "Villa Boarding House",
    owedCentavos: 350_000,
    daysOverdue: 4,
  },
];

export const totalArrears = arrears.reduce((n, a) => n + a.owedCentavos, 0);

/* ----------------------------------------------------------------- payments */

export type OwnerPayment = {
  id: string;
  reference: string;
  tenant: string;
  resourceLabel: string;
  amountCentavos: Money;
  origin: "ONLINE" | "OFFLINE_RECORDED";
  method?: string;
  recordedBy?: string;
  receivedAt: string;
  recordedAt: string;
};

export const recentPayments: OwnerPayment[] = [
  {
    id: "p-1",
    reference: "PAY-2026-08-318",
    tenant: "Grace Lim",
    resourceLabel: "Bed C, Room 204",
    amountCentavos: 350_000,
    origin: "ONLINE",
    method: "GCash",
    receivedAt: "2026-08-19T18:22:00+08:00",
    recordedAt: "2026-08-19T18:22:00+08:00",
  },
  {
    id: "p-2",
    reference: "PAY-2026-08-317",
    tenant: "Kevin Tan",
    resourceLabel: "Room 102",
    amountCentavos: 600_000,
    origin: "OFFLINE_RECORDED",
    recordedBy: "Marco Diaz",
    receivedAt: "2026-08-18T19:00:00+08:00",
    recordedAt: "2026-08-19T08:40:00+08:00",
  },
  {
    id: "p-3",
    reference: "PAY-2026-08-311",
    tenant: "Ana Reyes",
    resourceLabel: "Unit 203",
    amountCentavos: 500_000,
    origin: "OFFLINE_RECORDED",
    recordedBy: "Marco Diaz",
    receivedAt: "2026-08-14T19:30:00+08:00",
    recordedAt: "2026-08-16T09:12:00+08:00",
  },
  {
    id: "p-4",
    reference: "PAY-2026-08-309",
    tenant: "Liza Ramos",
    resourceLabel: "Unit 108",
    amountCentavos: 850_000,
    origin: "ONLINE",
    method: "Maya",
    receivedAt: "2026-08-12T09:15:00+08:00",
    recordedAt: "2026-08-12T09:15:00+08:00",
  },
  {
    id: "p-5",
    reference: "PAY-2026-08-302",
    tenant: "Paolo Suarez",
    resourceLabel: "Parking 12",
    amountCentavos: 200_000,
    origin: "OFFLINE_RECORDED",
    recordedBy: "Elena Rosales",
    receivedAt: "2026-08-06T17:45:00+08:00",
    recordedAt: "2026-08-06T18:02:00+08:00",
  },
];

/** Cash is roughly half of what comes in — the reason D-08 exists. */
export const offlineShare = Math.round(
  (recentPayments
    .filter((p) => p.origin === "OFFLINE_RECORDED")
    .reduce((n, p) => n + p.amountCentavos, 0) /
    recentPayments.reduce((n, p) => n + p.amountCentavos, 0)) *
    100,
);

/* -------------------------------------------------------------- maintenance */

export type OwnerMaintenance = {
  id: string;
  reference: string;
  title: string;
  resourceLabel: string;
  propertyName: string;
  reportedBy: string;
  state: "REPORTED" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED";
  priority: "LOW" | "NORMAL" | "URGENT";
  reportedAt: string;
  assignee?: string;
};

export const maintenance: OwnerMaintenance[] = [
  {
    id: "m-1",
    reference: "MR-118",
    title: "No water on the 3rd floor since morning",
    resourceLabel: "Unit 305",
    propertyName: "ABC Apartment",
    reportedBy: "Marisol Cruz",
    state: "REPORTED",
    priority: "URGENT",
    reportedAt: "2026-08-20T07:10:00+08:00",
  },
  {
    id: "m-2",
    reference: "MR-114",
    title: "Kitchen faucet leaking",
    resourceLabel: "Unit 203",
    propertyName: "ABC Apartment",
    reportedBy: "Ana Reyes",
    state: "IN_PROGRESS",
    priority: "NORMAL",
    reportedAt: "2026-08-12T08:20:00+08:00",
    assignee: "Marco Diaz",
  },
  {
    id: "m-3",
    reference: "MR-113",
    title: "Corridor light flickering",
    resourceLabel: "Room 204",
    propertyName: "Villa Boarding House",
    reportedBy: "Grace Lim",
    state: "ACKNOWLEDGED",
    priority: "LOW",
    reportedAt: "2026-08-11T21:00:00+08:00",
    assignee: "Elena Rosales",
  },
];

export const openMaintenance = maintenance.filter((m) => m.state !== "RESOLVED");
export const unacknowledged = maintenance.filter((m) => m.state === "REPORTED");

/* -------------------------------------------------------------- listings */

export type ListingRow = {
  id: string;
  title: string;
  propertyName: string;
  kind: "Monthly" | "Nightly";
  state: "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED";
  hasTour: boolean;
  priceCentavos: Money;
};

export const listings: ListingRow[] = [
  { id: "l-1", title: "One-bedroom corner unit", propertyName: "ABC Apartment", kind: "Monthly", state: "PUBLISHED", hasTour: true, priceCentavos: 850_000 },
  { id: "l-2", title: "Furnished condo with balcony", propertyName: "Skyline Residences", kind: "Monthly", state: "PUBLISHED", hasTour: true, priceCentavos: 1_500_000 },
  { id: "l-3", title: "Condo stay near IT Park", propertyName: "Skyline Residences", kind: "Nightly", state: "PENDING_APPROVAL", hasTour: true, priceCentavos: 150_000 },
  { id: "l-4", title: "Bed space near USC", propertyName: "Villa Boarding House", kind: "Monthly", state: "PUBLISHED", hasTour: true, priceCentavos: 350_000 },
  { id: "l-5", title: "Covered parking slot", propertyName: "ABC Apartment", kind: "Monthly", state: "DRAFT", hasTour: false, priceCentavos: 200_000 },
];

export const pendingListings = listings.filter(
  (l) => l.state === "PENDING_APPROVAL",
);

/* ---------------------------------------------------------------- activity */

export type ActivityItem = {
  id: string;
  kind: "payment" | "application" | "maintenance" | "listing" | "lease";
  text: string;
  detail?: string;
  at: string;
};

export const activity: ActivityItem[] = [
  { id: "a1", kind: "maintenance", text: "Marisol Cruz reported no water on the 3rd floor", detail: "Unit 305 · urgent · not yet acknowledged", at: "2026-08-20T07:10:00+08:00" },
  { id: "a2", kind: "payment", text: "Grace Lim paid ₱3,500 online", detail: "GCash · Bed C, Room 204", at: "2026-08-19T18:22:00+08:00" },
  { id: "a3", kind: "payment", text: "Marco Diaz recorded ₱6,000 cash from Kevin Tan", detail: "Room 102 · received 18 Aug, recorded 19 Aug", at: "2026-08-19T08:40:00+08:00" },
  { id: "a4", kind: "application", text: "Ana Reyes applied for Unit 203", detail: "Move-in 1 Sep · 3 documents attached", at: "2026-08-18T09:12:00+08:00" },
  { id: "a5", kind: "application", text: "Joel Mercado applied for Unit 203", detail: "Second applicant for the same unit", at: "2026-08-17T20:40:00+08:00" },
  { id: "a6", kind: "listing", text: "Condo stay near IT Park submitted for approval", detail: "Awaiting platform review", at: "2026-08-17T10:02:00+08:00" },
];
