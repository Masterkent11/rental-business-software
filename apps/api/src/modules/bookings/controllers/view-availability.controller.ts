import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { VIEW_AVAILABILITY } from '@/modules/bookings/booking.tokens.ts';
import type { viewAvailability } from '@/application/bookings/view-availability/view-availability.use-case.ts';
import { availabilityQuerySchema } from '@/modules/bookings/dto/booking.dto.ts';

@Controller('resources')
export class ViewAvailabilityController {
  constructor(
    @Inject(VIEW_AVAILABILITY)
    private readonly availability: ReturnType<typeof viewAvailability>,
  ) {}

  @Get(':id/availability')
  async nights(@Param('id') id: string, @Query() query: unknown) {
    if (!z.guid().safeParse(id).success) {
      throw new BadRequestException('Not a resource id');
    }

    const parsed = availabilityQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad range');
    }

    const nights = await this.availability({
      resourceId: id,
      startsOn: parsed.data.from,
      endsOn: parsed.data.to,
    });
    return { resourceId: id, nights };
  }
}
