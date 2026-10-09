import { Controller, Get, Inject } from '@nestjs/common';
import { LIST_AREAS } from '@/modules/listings/listing.tokens.ts';
import type { listAreas } from '@/application/listings/list-areas/list-areas.use-case.ts';
import { toAreaHttpResponse } from '@/modules/listings/mappers/listing-http.mapper.ts';

@Controller('locations')
export class LocationsController {
  constructor(
    @Inject(LIST_AREAS)
    private readonly areasUseCase: ReturnType<typeof listAreas>,
  ) {}

  @Get('areas')
  async areas() {
    const areas = await this.areasUseCase();
    return { items: areas.map(toAreaHttpResponse) };
  }
}
