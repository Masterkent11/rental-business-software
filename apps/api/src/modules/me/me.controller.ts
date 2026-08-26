import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { RESOLVE_PRINCIPAL, USER_REPOSITORY } from './me.tokens.ts';
import {
  OrganizationForbiddenError,
  UnauthenticatedError,
  type resolvePrincipal,
} from '../../features/authenticate/resolve-principal.ts';
import type { UserRepository } from '../../application/ports/user-repository.ts';
import type { Principal } from '../../domain/identity/capability.ts';

/**
 * Presentation for the signed-in user.
 *
 * Every handler resolves the principal first, which means every handler pays
 * for a capability lookup. That is ADR-0007's stated cost, taken deliberately:
 * a cached-across-requests principal would reintroduce exactly the stale
 * authority the design exists to prevent.
 */
@Controller()
export class MeController {
  constructor(
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  @Get('me')
  async me(
    @Headers('authorization') authorization?: string,
    @Headers('x-organization-id') organizationHeader?: string,
  ) {
    const principal = await this.principalFrom(authorization, organizationHeader);

    return {
      id: principal.userId,
      displayName: principal.displayName,
      // Sent so the client can shape its navigation, NOT so it can enforce
      // anything. Every authorization decision is made server-side; a client
      // that hid a button would still be talking to an API that checks.
      capabilities: principal.capabilities.map((held) => ({
        capability: held.capability,
        organizationId: held.organizationId,
      })),
      organizationId: principal.organizationId,
    };
  }

  @Get('me/stays')
  async stays(
    @Headers('authorization') authorization?: string,
    @Headers('x-organization-id') organizationHeader?: string,
  ) {
    const principal = await this.principalFrom(authorization, organizationHeader);
    const stays = await this.users.staysFor(principal.userId);

    return {
      stays: stays.map((stay) => ({
        id: stay.stayId,
        reference: stay.reference,
        listingTitle: stay.listingTitle,
        propertyName: stay.propertyName,
        areaLabel: stay.areaLabel,
        cityLabel: stay.cityLabel,
        startsOn: stay.startsOn,
        endsOn: stay.endsOn,
        nights: stay.nights,
        // Integer centavos across the wire, like every other amount.
        paidCentavos: stay.paidCentavos,
        paidAt: stay.paidAt?.toISOString() ?? null,
        state: stay.state,
        photo: stay.photo,
        // Copy and bucket are the server's, not the client's, so three clients
        // cannot disagree about the same stay.
        stateLabel: stay.stateLabel,
        bucket: stay.bucket,
      })),
    };
  }

  @Get('me/saved-listings')
  async saved(
    @Headers('authorization') authorization?: string,
    @Headers('x-organization-id') organizationHeader?: string,
  ) {
    const principal = await this.principalFrom(authorization, organizationHeader);
    return { listingIds: await this.users.savedListingIds(principal.userId) };
  }

  @Post('me/saved-listings')
  async save(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-organization-id') organizationHeader?: string,
  ) {
    const parsed = z.object({ listingId: z.guid() }).safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('listingId must be a listing id');
    }

    const principal = await this.principalFrom(authorization, organizationHeader);
    await this.users.saveListing(principal.userId, parsed.data.listingId);
    return { listingIds: await this.users.savedListingIds(principal.userId) };
  }

  @Delete('me/saved-listings/:listingId')
  async unsave(
    @Param('listingId') listingId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-organization-id') organizationHeader?: string,
  ) {
    const parsed = z.guid().safeParse(listingId);
    if (!parsed.success) throw new BadRequestException('Not a listing id');

    const principal = await this.principalFrom(authorization, organizationHeader);
    await this.users.unsaveListing(principal.userId, parsed.data);
    return { listingIds: await this.users.savedListingIds(principal.userId) };
  }

  /**
   * Translates the use case's refusals into HTTP.
   *
   * 401 and 403 are kept apart on purpose: "I do not know who you are" and "I
   * know who you are and you may not act there" are different problems, and a
   * client that cannot tell them apart will retry the wrong one.
   */
  private async principalFrom(
    authorization: string | undefined,
    organizationHeader: string | undefined,
  ): Promise<Principal> {
    const organizationId = organizationHeader?.trim()
      ? organizationHeader.trim()
      : null;

    if (organizationId !== null && !z.guid().safeParse(organizationId).success) {
      throw new BadRequestException('X-Organization-Id must be an id');
    }

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
}
