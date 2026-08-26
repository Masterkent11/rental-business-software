"use client";

import { supabase } from "./supabase";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Call the API as the signed-in owner.
 *
 * The token is read per request rather than captured: the SDK refreshes in the
 * background, and a token held from page load would start failing an hour in.
 *
 * `X-Organization-Id` is sent because an owner may act in several organizations
 * and the API refuses to guess — it verifies the header against membership and
 * returns 403 rather than defaulting to one.
 */
async function call<T>(
  path: string,
  options: { method?: string; body?: unknown; organizationId?: string } = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(session ? { authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.organizationId
        ? { "x-organization-id": options.organizationId }
        : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    // problem+json carries `title`; fall back rather than surface raw HTML.
    let message = "Request failed";
    try {
      const problem = (await response.json()) as { message?: string; title?: string };
      message = problem.message ?? problem.title ?? message;
    } catch {
      // Not JSON. Nothing useful to show.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export type OwnerApplication = {
  id: string;
  reference: string;
  state:
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "WITHDRAWN"
    | "EXPIRED";
  listingTitle: string;
  propertyName: string;
  areaLabel: string;
  cityLabel: string;
  monthlyRentCentavos: number;
  desiredMoveIn: string;
  desiredTermMonths: number;
  message: string;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
  holdExpiresAt: string | null;
  documentCount: number;
  reservation: {
    state: string;
    feeCentavos: number;
    expiresAt: string | null;
  } | null;
};

/** One month of the owner's money, as the API answers it. */
export type Collection = {
  month: string;
  claimedCentavos: number;
  receivedCentavos: number;
  /** Everything still owed, not just this month's share. */
  outstandingCentavos: number;
  offlineSharePercent: number;
  history: { month: string; claimedCentavos: number; receivedCentavos: number }[];
  arrears: {
    tenantId: string | null;
    tenantName: string;
    occupancyId: string;
    resourceLabel: string;
    owedCentavos: number;
    oldestDueOn: string;
    daysOverdue: number;
    invoiceCount: number;
  }[];
  recentPayments: {
    id: string;
    tenantName: string;
    resourceLabel: string;
    amountCentavos: number;
    origin: "ONLINE" | "OFFLINE_RECORDED";
    reference: string | null;
    recordedBy: string | null;
    receivedAt: string | null;
    recordedAt: string;
  }[];
};

export type Me = {
  id: string;
  displayName: string;
  capabilities: { capability: string; organizationId: string | null }[];
};

export const api = {
  me: () => call<Me>("/me"),

  collection: (organizationId: string) =>
    call<Collection>(`/organizations/${organizationId}/collection`, {
      organizationId,
    }),

  applications: (organizationId: string) =>
    call<{ applications: OwnerApplication[] }>(
      `/organizations/${organizationId}/applications`,
      { organizationId },
    ),

  decide: (
    organizationId: string,
    applicationId: string,
    decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW",
    reason?: string,
  ) =>
    call<{ id: string; state: string; decisionReason: string | null }>(
      `/organizations/${organizationId}/applications/${applicationId}/decision`,
      {
        method: "POST",
        organizationId,
        body: { decision, ...(reason ? { reason } : {}) },
      },
    ),
};
