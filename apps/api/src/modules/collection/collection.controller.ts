import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import {
  APPLY_PAYMENT_TO_INVOICE,
  ISSUE_INVOICE,
  OWNER_COLLECTION,
} from './collection.tokens.ts';
import { RESOLVE_PRINCIPAL } from '../me/me.tokens.ts';
import {
  OrganizationForbiddenError,
  UnauthenticatedError,
  type resolvePrincipal,
} from '../../features/authenticate/resolve-principal.ts';
import type {
  applyPaymentToInvoice,
  issueInvoice,
  ownerCollection,
} from '../../features/collect-rent/collect-rent.ts';
import {
  EmptyInvoiceError,
  InvalidPeriodError,
  InvoiceMissingError,
} from '../../features/collect-rent/collect-rent.ts';
import {
  InvoiceNotSettleableError,
  InvoiceOverpaidError,
} from '../../domain/money/invoice.ts';
import { OccupancyNotInOrganizationError } from '../../application/ports/invoice-repository.ts';
import { hasCapability, type Principal } from '../../domain/identity/capability.ts';
import { centavos } from '../../domain/shared/money.ts';

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const issueBody = z.object({
  occupancyId: z.guid(),
  periodStart: ISO_DATE,
  periodEnd: ISO_DATE,
  dueOn: ISO_DATE,
  lines: z
    .array(
      z.object({
        kind: z.enum(['RENT', 'ADVANCE', 'DEPOSIT', 'UTILITY', 'PENALTY', 'OTHER']),
        description: z.string().min(1).max(200),
        amountCentavos: z.number().int().nonnegative(),
      }),
    )
    .min(1, 'An invoice needs at least one line'),
});

const applyBody = z.object({
  paymentId: z.guid(),
  amountCentavos: z.number().int().positive(),
});

/**
 * The owner's money.
 *
 * Every route here is organization-scoped and every one of them checks the
 * capability on top of membership: being a member of an organization is not
 * the same as being allowed to see what everybody owes it.
 */
@Controller()
export class CollectionController {
  constructor(
    @Inject(OWNER_COLLECTION)
    private readonly collection: ReturnType<typeof ownerCollection>,
    @Inject(ISSUE_INVOICE)
    private readonly issue: ReturnType<typeof issueInvoice>,
    @Inject(APPLY_PAYMENT_TO_INVOICE)
    private readonly apply: ReturnType<typeof applyPaymentToInvoice>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  /** "Who owes me money this month?", in one request. */
  @Get('organizations/:organizationId/collection')
  async forOwner(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') auth?: string,
  ) {
    this.assertId(organizationId);
    const principal = await this.principal(auth, organizationId);
    this.assertMaySeeMoney(principal, organizationId);

    const collection = await this.collection(organizationId);

    return {
      month: collection.month,
      claimedCentavos: collection.claimedCentavos,
      receivedCentavos: collection.receivedCentavos,
      outstandingCentavos: collection.outstandingCentavos,
      offlineSharePercent: collection.offlineSharePercent,
      history: collection.history,
      arrears: collection.arrears.map((row) => ({
        tenantId: row.tenantId,
        tenantName: row.tenantName,
        occupancyId: row.occupancyId,
        resourceLabel: row.resourceLabel,
        owedCentavos: row.owedCentavos,
        oldestDueOn: row.oldestDueOn,
        daysOverdue: row.daysOverdue,
        invoiceCount: row.invoiceCount,
      })),
      recentPayments: collection.recentPayments.map((payment) => ({
        id: payment.id,
        tenantName: payment.tenantName,
        resourceLabel: payment.resourceLabel,
        amountCentavos: payment.amountCentavos,
        origin: payment.origin,
        reference: payment.reference,
        recordedBy: payment.recordedBy,
        receivedAt: payment.receivedAt?.toISOString() ?? null,
        recordedAt: payment.recordedAt.toISOString(),
      })),
    };
  }

  @Post('organizations/:organizationId/invoices')
  async raise(
    @Param('organizationId') organizationId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    this.assertId(organizationId);

    const parsed = issueBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.principal(auth, organizationId);
    this.assertMaySeeMoney(principal, organizationId);

    try {
      const invoice = await this.issue({
        organizationId,
        ...parsed.data,
        // Through the brand constructor rather than a cast: this is the edge
        // where an untrusted number becomes money, and it is the only place
        // "whole centavos, never negative" can still be checked.
        lines: parsed.data.lines.map((line) => ({
          ...line,
          amountCentavos: centavos(line.amountCentavos),
        })),
      });
      return {
        id: invoice.id,
        number: invoice.number,
        state: invoice.state,
        totalCentavos: invoice.totalCentavos,
        dueOn: invoice.dueOn,
      };
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Post('organizations/:organizationId/invoices/:invoiceId/applications')
  async settle(
    @Param('organizationId') organizationId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    this.assertId(organizationId);
    this.assertId(invoiceId);

    const parsed = applyBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.principal(auth, organizationId);
    this.assertMaySeeMoney(principal, organizationId);

    try {
      const invoice = await this.apply({
        organizationId,
        invoiceId,
        paymentId: parsed.data.paymentId,
        amountCentavos: centavos(parsed.data.amountCentavos),
      });
      return {
        id: invoice.id,
        state: invoice.state,
        totalCentavos: invoice.totalCentavos,
        amountPaidCentavos: invoice.amountPaidCentavos,
      };
    } catch (error) {
      throw this.translate(error);
    }
  }

  private assertId(value: string): void {
    if (!z.guid().safeParse(value).success) {
      throw new BadRequestException('Not an id');
    }
  }

  /**
   * Only an owner or staff member of *this* organization sees its money.
   *
   * A capability held at one organization says nothing about another, which is
   * what stops a staff member of one agency reading a competitor's arrears.
   */
  private assertMaySeeMoney(principal: Principal, organizationId: string): void {
    const allowed =
      hasCapability(principal, 'OWNER', organizationId) ||
      hasCapability(principal, 'STAFF', organizationId);

    if (!allowed) {
      throw new ForbiddenException('You may not see this organization’s money');
    }
  }

  private async principal(
    authorization: string | undefined,
    organizationId: string | null,
  ): Promise<Principal> {
    try {
      return await this.resolve({ authorization, organizationId });
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        throw new UnauthorizedException(error.message);
      }
      if (error instanceof OrganizationForbiddenError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  private translate(error: unknown): Error {
    // I-04 reaches the owner as a sentence about their money, not a constraint
    // name. 409 rather than 400: the request was well formed, the world just
    // disagrees with it.
    if (error instanceof InvoiceOverpaidError || error instanceof InvoiceNotSettleableError) {
      return new ConflictException(error.message);
    }
    if (error instanceof InvoiceMissingError) {
      return new NotFoundException(error.message);
    }
    if (error instanceof OccupancyNotInOrganizationError) {
      return new NotFoundException('No such occupancy in this organization');
    }
    if (error instanceof EmptyInvoiceError || error instanceof InvalidPeriodError) {
      return new BadRequestException(error.message);
    }
    return error as Error;
  }
}
