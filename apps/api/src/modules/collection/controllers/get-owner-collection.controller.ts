import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
} from '@nestjs/common';
import { z } from 'zod';
import { OWNER_COLLECTION } from '@/modules/collection/collection.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { getOwnerCollection } from '@/application/collection/get-owner-collection/get-owner-collection.use-case.ts';
import { toCollectionHttpResponse } from '@/modules/collection/mappers/collection-http.mapper.ts';

@Controller('organizations/:organizationId/collection')
export class GetOwnerCollectionController {
  constructor(
    @Inject(OWNER_COLLECTION)
    private readonly collectionUseCase: ReturnType<typeof getOwnerCollection>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get()
  async forOwner(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') auth?: string,
  ) {
    if (!z.guid().safeParse(organizationId).success) {
      throw new BadRequestException('Not an id');
    }

    const principal = await this.resolve({ authorization: auth, organizationId });
    const collection = await this.collectionUseCase({ principal, organizationId });

    return toCollectionHttpResponse(collection);
  }
}
