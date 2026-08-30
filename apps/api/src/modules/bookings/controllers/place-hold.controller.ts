import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Post,
} from '@nestjs/common';
import { PLACE_HOLD } from '@/modules/bookings/booking.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { placeHold } from '@/application/bookings/place-hold/place-hold.use-case.ts';
import { holdBodySchema } from '@/modules/bookings/dto/booking.dto.ts';
import { toBookingHttpResponse } from '@/modules/bookings/mappers/booking-http.mapper.ts';

@Controller('bookings')
export class PlaceHoldController {
  constructor(
    @Inject(PLACE_HOLD)
    private readonly hold: ReturnType<typeof placeHold>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post()
  async book(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const parsed = holdBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.resolve({ authorization, organizationId: null });
    const occupancy = await this.hold({ ...parsed.data, heldBy: principal.userId });
    return toBookingHttpResponse(occupancy);
  }
}
