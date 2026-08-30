import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { APPLY_PAYMENT_TO_INVOICE } from '@/modules/collection/collection.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { applyPaymentToInvoice } from '@/application/collection/apply-payment-to-invoice/apply-payment-to-invoice.use-case.ts';
import { centavos } from '@/domain/shared/money.ts';
import { applyPaymentSchema } from '@/modules/collection/dto/apply-payment.dto.ts';
import { toAppliedInvoiceHttpResponse } from '@/modules/collection/mappers/collection-http.mapper.ts';

@Controller('organizations/:organizationId/invoices')
export class ApplyPaymentToInvoiceController {
  constructor(
    @Inject(APPLY_PAYMENT_TO_INVOICE)
    private readonly applyUseCase: ReturnType<typeof applyPaymentToInvoice>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post(':invoiceId/applications')
  async settle(
    @Param('organizationId') organizationId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    if (
      !z.guid().safeParse(organizationId).success ||
      !z.guid().safeParse(invoiceId).success
    ) {
      throw new BadRequestException('Not an id');
    }

    const parsed = applyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.resolve({ authorization: auth, organizationId });
    const invoice = await this.applyUseCase({
      principal,
      organizationId,
      invoiceId,
      paymentId: parsed.data.paymentId,
      amountCentavos: centavos(parsed.data.amountCentavos),
    });

    return toAppliedInvoiceHttpResponse(invoice);
  }
}
