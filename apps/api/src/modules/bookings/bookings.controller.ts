import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Headers,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { OCCUPANCY_REPOSITORY, PLACE_HOLD, VIEW_AVAILABILITY } from './booking.tokens.ts';
import { RESOLVE_PRINCIPAL } from '../me/me.tokens.ts';
import {
  OrganizationForbiddenError,
  UnauthenticatedError,
  type resolvePrincipal,
} from '../../features/authenticate/resolve-principal.ts';
import type { placeHold, viewAvailability } from '../../features/book-resource/place-hold.ts';
import { StayTooLongError } from '../../features/book-resource/place-hold.ts';
import {
  InvalidDateRangeError,
  nightCount,
} from '../../domain/occupancy/occupancy.ts';
import {
  NotBookableError,
  OccupancyConflictError,
  SerializationError,
} from '../../application/ports/occupancy-repository.ts';

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const availabilityQuery = z.object({ from: ISO_DATE, to: ISO_DATE });
const holdBody = z.object({
  resourceId: z.guid(),
  startsOn: ISO_DATE,
  endsOn: ISO_DATE,
});

@Controller()
export class BookingsController {
  constructor(
    @Inject(VIEW_AVAILABILITY)
    private readonly availability: ReturnType<typeof viewAvailability>,
    @Inject(PLACE_HOLD) private readonly hold: ReturnType<typeof placeHold>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
    @Inject(OCCUPANCY_REPOSITORY) private readonly _repo: unknown,
  ) {}

  @Get('resources/:id/availability')
  async nights(@Param('id') id: string, @Query() query: unknown) {
    if (!z.guid().safeParse(id).success) {
      throw new BadRequestException('Not a resource id');
    }

    const parsed = availabilityQuery.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad range');
    }

    try {
      const nights = await this.availability({
        resourceId: id,
        startsOn: parsed.data.from,
        endsOn: parsed.data.to,
      });
      return { resourceId: id, nights };
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Post('bookings')
  async book(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const parsed = holdBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    // Signing in first is not friction here: a booking nobody owns cannot be
    // shown to the customer, and at check-in nobody can say who is arriving.
    let heldBy: string;
    try {
      const principal = await this.resolve({ authorization, organizationId: null });
      heldBy = principal.userId;
    } catch (error) {
      if (
        error instanceof UnauthenticatedError ||
        error instanceof OrganizationForbiddenError
      ) {
        throw new UnauthorizedException('Sign in to book');
      }
      throw error;
    }

    try {
      const occupancy = await this.hold({ ...parsed.data, heldBy });

      return {
        id: occupancy.id,
        resourceId: occupancy.resourceId,
        state: occupancy.state,
        startsOn: occupancy.during.startsOn,
        endsOn: occupancy.during.endsOn,
        nights: nightCount(occupancy.during),
        // The customer needs to know how long they have, not be surprised by
        // the nights going back.
        expiresAt: occupancy.expiresAt?.toISOString() ?? null,
      };
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * 409 for a real conflict, 503 for a timing accident.
   *
   * Kept apart because they mean opposite things to the caller: one says stop
   * and choose other nights, the other says try again. Collapsing them would
   * have a client retrying a booking that will never succeed.
   */
  private translate(error: unknown): Error {
    if (error instanceof NotBookableError) {
      // Absent, not forbidden — consistent with every other unpublished read.
      return new NotFoundException(error.message);
    }
    if (error instanceof OccupancyConflictError) {
      return new ConflictException(error.message);
    }
    if (error instanceof SerializationError) {
      return new ServiceUnavailableException('Busy right now — try again');
    }
    if (
      error instanceof InvalidDateRangeError ||
      error instanceof StayTooLongError
    ) {
      return new BadRequestException(error.message);
    }
    return error as Error;
  }
}
