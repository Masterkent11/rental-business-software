import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
} from '@nestjs/common';
import { z } from 'zod';
import { GET_MY_BOOKING, LIST_MY_BOOKINGS } from '@/modules/bookings/booking.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { listMyBookings } from '@/application/bookings/list-my-bookings/list-my-bookings.use-case.ts';
import type { getMyBooking } from '@/application/bookings/get-my-booking/get-my-booking.use-case.ts';
import { toBookingSummaryHttpResponse } from '@/modules/bookings/mappers/booking-http.mapper.ts';

@Controller('me/bookings')
export class MyBookingsController {
  constructor(
    @Inject(LIST_MY_BOOKINGS)
    private readonly list: ReturnType<typeof listMyBookings>,
    @Inject(GET_MY_BOOKING)
    private readonly get: ReturnType<typeof getMyBooking>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get()
  async mine(@Headers('authorization') authorization?: string) {
    const principal = await this.resolve({ authorization, organizationId: null });
    const bookings = await this.list({ principal });
    return { bookings: bookings.map((b) => toBookingSummaryHttpResponse(b, false)) };
  }

  @Get(':id')
  async one(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    if (!z.guid().safeParse(id).success) throw new BadRequestException('Not a booking id');
    const principal = await this.resolve({ authorization, organizationId: null });
    const booking = await this.get({ principal, bookingId: id });
    return toBookingSummaryHttpResponse(booking, false);
  }
}
