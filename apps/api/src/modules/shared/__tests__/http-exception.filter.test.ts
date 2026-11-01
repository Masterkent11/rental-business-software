import {
  PaymentNotPendingError,
  InvalidPaymentOccupancyError,
} from "@/domain/payments/payment-errors.ts";
import type { ArgumentsHost } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  InvoiceNotFoundError,
  PaymentNotInOrganizationError,
} from "@/application/ports/repositories/invoice-repository.port.ts";
import {
  PaymentAllocationError,
  InvalidInvoiceAmountError,
} from "@/domain/collection/collection-errors.ts";
import { PresentationExceptionFilter } from "@/modules/shared/http-exception.filter.ts";

describe("dependency failures", () => {
  afterEach(() => vi.restoreAllMocks());
  it.each([
    "08006",
    "57P01",
    "57P03",
    "53300",
    "ECONNREFUSED",
    "CONNECT_TIMEOUT",
    "CONNECTION_CLOSED",
  ])("maps %s to a retryable response without database details", (code) => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    new PresentationExceptionFilter().catch(
      Object.assign(new Error("private database connection details"), { code }),
      host,
    );
    expect(status).toHaveBeenCalledWith(503);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SERVICE_UNAVAILABLE" }),
    );
    expect(JSON.stringify(send.mock.calls)).not.toContain("private database");
  });
  it("keeps unexpected failures as server errors", () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    new PresentationExceptionFilter().catch(
      Object.assign(new Error("private schema details"), { code: "42P01" }),
      host,
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(send.mock.calls)).not.toContain("private schema");
  });
});

describe("allocation error contract", () => {
  it.each([
    [
      new PaymentNotInOrganizationError("No applicable payment."),
      404,
      "NOT_FOUND",
    ],
    [new InvoiceNotFoundError("No applicable invoice."), 404, "NOT_FOUND"],
    [
      new PaymentAllocationError("Payment balance is insufficient."),
      409,
      "CONFLICT",
    ],
    [new PaymentNotPendingError("Not pending."), 409, "CONFLICT"],
    [new InvalidPaymentOccupancyError("Hold ended."), 409, "CONFLICT"],
    [
      new InvalidInvoiceAmountError("The invoice total is too large."),
      400,
      "INVALID_REQUEST",
    ],
  ] as const)(
    "maps allocation failures to their public status",
    (error, expectedStatus, expectedCode) => {
      const send = vi.fn(),
        status = vi.fn().mockReturnValue({ send });
      const host = {
        switchToHttp: () => ({ getResponse: () => ({ status }) }),
      } as unknown as ArgumentsHost;
      new PresentationExceptionFilter().catch(error, host);
      expect(status).toHaveBeenCalledWith(expectedStatus);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: expectedStatus,
          code: expectedCode,
        }),
      );
    },
  );
});

import {
  MarketingUnavailableError,
  MarketingForbiddenError,
  MarketingConflictError,
} from "@/domain/marketing/marketing.ts";
it.each([
  [
    new MarketingUnavailableError("Marketing is unavailable."),
    503,
    "MARKETING_UNAVAILABLE",
  ],
  [
    new MarketingForbiddenError("An Agent workspace is required."),
    403,
    "FORBIDDEN",
  ],
  [new MarketingConflictError("Reload the current version."), 409, "CONFLICT"],
] as const)(
  "maps marketing failures without losing their public code",
  (error, expectedStatus, expectedCode) => {
    const send = vi.fn(),
      status = vi.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    new PresentationExceptionFilter().catch(error, host);
    expect(status).toHaveBeenCalledWith(expectedStatus);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ code: expectedCode }),
    );
  },
);
