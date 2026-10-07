import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  GET_ORGANIZATION_BOOKING,
  LIST_ORGANIZATION_BOOKINGS,
  UPDATE_BOOKING_STATUS,
} from '@/modules/bookings/booking.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { listOrganizationBookings } from '@/application/bookings/list-organization-bookings/list-organization-bookings.use-case.ts';
import type { getOrganizationBooking } from '@/application/bookings/get-organization-booking/get-organization-booking.use-case.ts';
import type { updateBookingStatus } from '@/application/bookings/update-booking-status/update-booking-status.use-case.ts';
import {
  bookingStatusSchema,
  organizationBookingsQuerySchema,
} from '@/modules/bookings/dto/booking.dto.ts';
import { toBookingSummaryHttpResponse } from '@/modules/bookings/mappers/booking-http.mapper.ts';

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new BadRequestException(`Not a valid ${what} id`);
  return value;
};

@Controller('organizations/:organizationId/bookings')
export class OrganizationBookingsController {
  constructor(
    @Inject(LIST_ORGANIZATION_BOOKINGS)
    private readonly list: ReturnType<typeof listOrganizationBookings>,
    @Inject(GET_ORGANIZATION_BOOKING)
    private readonly get: ReturnType<typeof getOrganizationBooking>,
    @Inject(UPDATE_BOOKING_STATUS)
    private readonly update: ReturnType<typeof updateBookingStatus>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get()
  async index(
    @Param('organizationId') organizationId: string,
    @Query() rawQuery: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const parsed = organizationBookingsQuerySchema.safeParse(rawQuery ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad query');
    const principal = await this.resolve({ authorization, organizationId: guid(organizationId, 'organization') });
    const page = await this.list({
      principal,
      organizationId,
      ...(parsed.data.bucket ? { bucket: parsed.data.bucket } : {}),
      ...(parsed.data.q ? { text: parsed.data.q } : {}),
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
    return {
      items: page.items.map((b) => toBookingSummaryHttpResponse(b, true)),
      total: page.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    };
  }

  @Get(':id')
  async show(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const principal = await this.resolve({ authorization, organizationId: guid(organizationId, 'organization') });
    const booking = await this.get({ principal, organizationId, bookingId: guid(id, 'booking') });
    return toBookingSummaryHttpResponse(booking, true);
  }

  @Post(':id/status')
  @HttpCode(200)
  async changeStatus(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const parsed = bookingStatusSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    const principal = await this.resolve({ authorization, organizationId: guid(organizationId, 'organization') });
    const booking = await this.update({
      principal,
      organizationId,
      bookingId: guid(id, 'booking'),
      action: parsed.data.action,
    });
    return toBookingSummaryHttpResponse(booking, true);
  }
}
