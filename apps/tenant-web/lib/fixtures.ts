/**
 * PRESENTATION VIEW MODELS AND SAMPLE DATA — NOT DOMAIN MODELS.
 *
 * The domain lives in `docs/03-domain/` and is enforced server-side. Nothing
 * here is an entity, and this app computes no rule of its own:
 *
 *   * **Balances arrive computed.** "What do I owe right now?" is answered by
 *     the server from the ledger; a client that re-derived it would be a second
 *     source of truth for the one number the tenant most needs to trust.
 *   * **Payment origin is carried, never inferred.** An online payment and a
 *     staff-recorded cash payment are different kinds of evidence (D-09), and
 *     this app renders that difference rather than flattening it.
 *
 * Replaced wholesale once Step 5 defines the API contracts.
 */

export type InvoiceState =
  | "DUE"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "WAIVED";

export type PaymentOrigin = "ONLINE" | "OFFLINE_RECORDED";

export type MaintenanceState =
  | "REPORTED"
  | "ACKNOWLEDGED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export type InvoiceLine = { label: string; centavos: number };

export type Invoice = {
  id: string;
  reference: string;
  periodLabel: string;
  lines: InvoiceLine[];
  totalCentavos: number;
  paidCentavos: number;
  dueDate: string;
  issuedAt: string;
  state: InvoiceState;
  waivedReason?: string;
};

export type Payment = {
  id: string;
  reference: string;
  amountCentavos: number;
  origin: PaymentOrigin;
  /** Online only — proof the platform can verify independently. */
  method?: string;
  /** Offline only — who attested that cash changed hands. */
  recordedBy?: string;
  /** When the money actually moved. */
  receivedAt: string;
  /** When it was entered into the platform. Differs for cash, and that gap is
   *  the single most sensitive state in the tenant experience. */
  recordedAt: string;
  appliedTo: string;
};

export type MaintenanceRequest = {
  id: string;
  reference: string;
  title: string;
  description: string;
  state: MaintenanceState;
  reportedAt: string;
  acknowledgedAt?: string;
  assignee?: string;
  lastUpdate: string;
  photoCount: number;
};

export type TenantDocument = {
  id: string;
  name: string;
  kind: "Lease" | "Receipt" | "Notice" | "Move-in";
  issuedAt: string;
  sizeLabel: string;
};

/** U-02: the deposit is a held liability, not a paid invoice. */
export type DepositBalance = {
  heldCentavos: number;
  appliedCentavos: number;
  returnedCentavos: number;
  state: "HELD" | "PENDING_SETTLEMENT" | "SETTLED";
};

export type Lease = {
  id: string;
  reference: string;
  resourceLabel: string;
  propertyName: string;
  addressLabel: string;
  organizationName: string;
  monthlyRentCentavos: number;
  billingDay: number;
  startDate: string;
  endDate: string;
  state: "ACTIVE" | "NOTICE_GIVEN" | "ENDING" | "PENDING_SETTLEMENT";
  coTenants: string[];
  deposit: DepositBalance;
  terms: string[];
  houseRules: string[];
};

export const lease: Lease = {
  id: "lse-2026-0142",
  reference: "L-2026-0142",
  resourceLabel: "Unit 203",
  propertyName: "ABC Apartment",
  addressLabel: "12 Mabini St., Brgy. Kamputhaw, Cebu City",
  organizationName: "Santos Property Holdings",
  monthlyRentCentavos: 850_000,
  billingDay: 5,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  state: "ACTIVE",
  coTenants: ["Ana Reyes", "Miguel Reyes"],
  deposit: {
    heldCentavos: 1_700_000,
    appliedCentavos: 0,
    returnedCentavos: 0,
    state: "HELD",
  },
  terms: [
    "12-month term, 1 January to 31 December 2026",
    "Rent ₱8,500, due on the 5th of each month",
    "1 month advance + 2 months deposit paid on signing",
    "Water and electricity billed separately",
    "30 days written notice to terminate",
  ],
  houseRules: ["No pets", "No smoking indoors", "Visitors until 10 PM"],
};

export const invoices: Invoice[] = [
  {
    id: "inv-2026-09",
    reference: "INV-2026-09-0142",
    periodLabel: "September 2026",
    lines: [{ label: "Monthly rent", centavos: 850_000 }],
    totalCentavos: 850_000,
    paidCentavos: 0,
    dueDate: "2026-09-05",
    issuedAt: "2026-08-29",
    state: "DUE",
  },
  {
    id: "inv-2026-08",
    reference: "INV-2026-08-0142",
    periodLabel: "August 2026",
    lines: [{ label: "Monthly rent", centavos: 850_000 }],
    totalCentavos: 850_000,
    paidCentavos: 500_000,
    dueDate: "2026-08-05",
    issuedAt: "2026-07-29",
    state: "OVERDUE",
  },
  {
    id: "inv-2026-07",
    reference: "INV-2026-07-0142",
    periodLabel: "July 2026",
    lines: [{ label: "Monthly rent", centavos: 850_000 }],
    totalCentavos: 850_000,
    paidCentavos: 850_000,
    dueDate: "2026-07-05",
    issuedAt: "2026-06-29",
    state: "PAID",
  },
  {
    id: "inv-2026-06",
    reference: "INV-2026-06-0142",
    periodLabel: "June 2026",
    lines: [
      { label: "Monthly rent", centavos: 850_000 },
      { label: "Replacement door key", centavos: 25_000 },
    ],
    totalCentavos: 875_000,
    paidCentavos: 875_000,
    dueDate: "2026-06-05",
    issuedAt: "2026-05-29",
    state: "PAID",
  },
  {
    id: "inv-2026-05",
    reference: "INV-2026-05-0142",
    periodLabel: "May 2026",
    lines: [{ label: "Monthly rent", centavos: 850_000 }],
    totalCentavos: 850_000,
    paidCentavos: 0,
    dueDate: "2026-05-05",
    issuedAt: "2026-04-29",
    state: "WAIVED",
    waivedReason: "Unit was without water for three weeks — waived by owner.",
  },
];

export const payments: Payment[] = [
  {
    id: "pay-08-a",
    reference: "PAY-2026-08-311",
    amountCentavos: 500_000,
    origin: "OFFLINE_RECORDED",
    recordedBy: "Marco Diaz",
    receivedAt: "2026-08-14T19:30:00+08:00",
    // Two days between handing over cash and it appearing. Visible on purpose.
    recordedAt: "2026-08-16T09:12:00+08:00",
    appliedTo: "INV-2026-08-0142",
  },
  {
    id: "pay-07-a",
    reference: "PAY-2026-07-288",
    amountCentavos: 850_000,
    origin: "ONLINE",
    method: "GCash",
    receivedAt: "2026-07-03T21:04:00+08:00",
    recordedAt: "2026-07-03T21:04:00+08:00",
    appliedTo: "INV-2026-07-0142",
  },
  {
    id: "pay-06-a",
    reference: "PAY-2026-06-241",
    amountCentavos: 875_000,
    origin: "OFFLINE_RECORDED",
    recordedBy: "Marco Diaz",
    receivedAt: "2026-06-04T18:45:00+08:00",
    recordedAt: "2026-06-04T20:10:00+08:00",
    appliedTo: "INV-2026-06-0142",
  },
];

export const maintenance: MaintenanceRequest[] = [
  {
    id: "mnt-114",
    reference: "MR-114",
    title: "Kitchen faucet leaking",
    description:
      "Water drips continuously from the base of the faucet. Getting worse over the last week.",
    state: "IN_PROGRESS",
    reportedAt: "2026-08-12T08:20:00+08:00",
    acknowledgedAt: "2026-08-12T10:05:00+08:00",
    assignee: "Marco Diaz",
    lastUpdate: "2026-08-18T14:00:00+08:00",
    photoCount: 2,
  },
  {
    id: "mnt-109",
    reference: "MR-109",
    title: "Bedroom aircon not cooling",
    description: "Runs but blows warm air. Cleaned the filter already.",
    state: "RESOLVED",
    reportedAt: "2026-06-30T21:40:00+08:00",
    acknowledgedAt: "2026-07-01T07:55:00+08:00",
    assignee: "Marco Diaz",
    lastUpdate: "2026-07-04T16:20:00+08:00",
    photoCount: 1,
  },
  {
    id: "mnt-101",
    reference: "MR-101",
    title: "Corridor light bulb out",
    description: "Second floor corridor, outside 203.",
    state: "CLOSED",
    reportedAt: "2026-04-11T19:00:00+08:00",
    acknowledgedAt: "2026-04-11T19:40:00+08:00",
    assignee: "Marco Diaz",
    lastUpdate: "2026-04-12T09:00:00+08:00",
    photoCount: 0,
  },
];

export const documents: TenantDocument[] = [
  { id: "doc-1", name: "Lease agreement L-2026-0142", kind: "Lease", issuedAt: "2025-12-28", sizeLabel: "412 KB" },
  { id: "doc-2", name: "Move-in condition report", kind: "Move-in", issuedAt: "2026-01-01", sizeLabel: "1.2 MB" },
  { id: "doc-3", name: "Receipt PAY-2026-08-311", kind: "Receipt", issuedAt: "2026-08-16", sizeLabel: "84 KB" },
  { id: "doc-4", name: "Receipt PAY-2026-07-288", kind: "Receipt", issuedAt: "2026-07-03", sizeLabel: "86 KB" },
  { id: "doc-5", name: "Notice: water interruption 12–14 May", kind: "Notice", issuedAt: "2026-05-10", sizeLabel: "62 KB" },
];

/** Outstanding across every unpaid claim — the server's number, not ours. */
export const outstandingCentavos = invoices
  .filter((i) => i.state === "DUE" || i.state === "OVERDUE" || i.state === "PARTIALLY_PAID")
  .reduce((sum, i) => sum + (i.totalCentavos - i.paidCentavos), 0);

export const openInvoices = invoices.filter(
  (i) => i.state === "DUE" || i.state === "OVERDUE" || i.state === "PARTIALLY_PAID",
);

export const invoiceById = (id: string) => invoices.find((i) => i.id === id);
export const requestById = (id: string) => maintenance.find((m) => m.id === id);

/**
 * The tenant's own place, photographed.
 *
 * The same interior shots the customer app uses for `lst-unit-203` — this is
 * literally the listing they applied through, so seeing it again on their
 * dashboard is the product being one product rather than two that share a
 * logo.
 */
export const propertyPhoto =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1400&auto=format&fit=crop";

export const propertyPhotoAlt =
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop";
