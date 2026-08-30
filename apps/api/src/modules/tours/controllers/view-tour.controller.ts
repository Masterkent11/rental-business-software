import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Redirect,
} from '@nestjs/common';
import { z } from 'zod';
import { GET_RESOURCE_TOUR, GET_TOUR_TILE_URL } from '@/modules/tours/tour.tokens.ts';
import type { getResourceTour, getTourTileUrl } from '@/application/tours/view-tour/view-tour.use-case.ts';
import { tileCoordsSchema } from '@/modules/tours/dto/tour.dto.ts';

@Controller()
export class ViewTourController {
  constructor(
    @Inject(GET_RESOURCE_TOUR)
    private readonly getResourceTourUseCase: ReturnType<typeof getResourceTour>,
    @Inject(GET_TOUR_TILE_URL)
    private readonly getTourTileUrlUseCase: ReturnType<typeof getTourTileUrl>,
  ) {}

  @Get('resources/:id/tour')
  async forResource(@Param('id') id: string) {
    if (!z.guid().safeParse(id).success) {
      throw new BadRequestException('Not a resource id');
    }

    const tour = await this.getResourceTourUseCase(id);
    if (!tour) throw new NotFoundException('No tour for this place');

    return tour;
  }

  @Get('tiles/:sceneId/:level/:x/:y')
  @Redirect()
  async tile(
    @Param('sceneId') sceneId: string,
    @Param('level') level: string,
    @Param('x') x: string,
    @Param('y') y: string,
  ) {
    const coords = tileCoordsSchema.safeParse({ sceneId, level, x, y });
    if (!coords.success) throw new BadRequestException('Not a tile');

    const url = await this.getTourTileUrlUseCase(coords.data);
    if (!url) throw new NotFoundException('No such tile');

    return { url, statusCode: 302 };
  }
}
