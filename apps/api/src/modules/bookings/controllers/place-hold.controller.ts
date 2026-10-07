import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Post,
} from '@nestjs/common';
import { CREATE_BOOKING } from '@/modules/bookings/booking.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { createBooking } from '@/application/bookings/create-booking/create-booking.use-case.ts';
import { holdBodySchema } from '@/modules/bookings/dto/booking.dto.ts';
import { toCreatedBookingHttpResponse } from '@/modules/bookings/mappers/booking-http.mapper.ts';

@Controller('bookings')
export class PlaceHoldController {
  constructor(
    @Inject(CREATE_BOOKING)
    private readonly create: ReturnType<typeof createBooking>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post()
  async book(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const parsed = holdBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.resolve({ authorization, organizationId: null });
    const created = await this.create({
      principal,
      listingId: parsed.data.listingId,
      startsOn: parsed.data.startsOn,
      endsOn: parsed.data.endsOn,
      guests: parsed.data.guests,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return toCreatedBookingHttpResponse(created);
  }
}
