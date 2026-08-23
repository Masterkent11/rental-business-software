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
import type { TourRepository } from '../../application/ports/tour-repository.ts';
import { isWalkable, type Scene, type Tour } from '../../domain/tours/tour.ts';
import { MEDIA_STORAGE, TOUR_REPOSITORY } from './tour.tokens.ts';
import type { MediaStorage } from '../../application/ports/media-storage.ts';

/**
 * The tour a customer walks.
 *
 * Shaped so the viewer can paint something on the first response: the preview
 * URL is right there, and tiles are addressed by a template the client fills
 * in as the customer looks around. No second round trip before the first pixel.
 */
@Controller()
export class ToursController {
  constructor(
    @Inject(TOUR_REPOSITORY) private readonly tours: TourRepository,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
  ) {}

  @Get('resources/:id/tour')
  async forResource(@Param('id') id: string) {
    if (!z.guid().safeParse(id).success) {
      throw new BadRequestException('Not a resource id');
    }

    const tour = await this.tours.publishedForResource(id);
    if (!tour) throw new NotFoundException('No tour for this place');

    // Only rooms the viewer can actually open. A tour that lists a room and
    // then cannot show it is the dead end I-07 exists to prevent.
    const walkable = tour.scenes.filter(isWalkable);
    if (walkable.length === 0) {
      throw new NotFoundException('No tour for this place');
    }

    return {
      id: tour.id,
      resourceId: tour.resourceId,
      entrySceneId: tour.entrySceneId ?? walkable[0]!.id,
      scenes: await Promise.all(walkable.map((scene) => this.toScene(scene))),
    };
  }

  private async toScene(scene: Scene) {
    return {
      id: scene.id,
      label: scene.label,
      position: scene.position,
      // Signed and short-lived, like every other private object.
      previewUrl: await this.signed(scene.previewPath),
      thumbnailUrl: await this.signed(scene.thumbnailPath),
      /**
       * The client substitutes {level}, {x} and {y}.
       *
       * A template rather than a list: the full pyramid is thousands of URLs,
       * and sending them all would cost more than the tiles the customer
       * actually looks at.
       */
      tileUrlTemplate: scene.tilePrefix
        ? `/tiles/${scene.id}/{level}/{x}/{y}`
        : null,
      tileLevels: scene.tileLevels,
      hotspots: scene.hotspots.map((hotspot) => ({
        id: hotspot.id,
        kind: hotspot.kind,
        yaw: hotspot.yaw,
        pitch: hotspot.pitch,
        label: hotspot.label,
        targetSceneId: hotspot.targetSceneId,
      })),
    };
  }

  /**
   * One tile, by level and position.
   *
   * A redirect to a signed storage URL rather than a proxy: the bytes go
   * straight from storage to the phone, so a customer looking around does not
   * pull every tile through an API worker. The signature is short-lived; the
   * tile itself is immutable, so the CDN and the client may cache it hard.
   */
  @Get('tiles/:sceneId/:level/:x/:y')
  @Redirect()
  async tile(
    @Param('sceneId') sceneId: string,
    @Param('level') level: string,
    @Param('x') x: string,
    @Param('y') y: string,
  ) {
    const coords = z
      .object({
        sceneId: z.guid(),
        level: z.coerce.number().int().min(0).max(8),
        x: z.coerce.number().int().min(0).max(64),
        y: z.coerce.number().int().min(0).max(64),
      })
      .safeParse({ sceneId, level, x, y });
    if (!coords.success) throw new BadRequestException('Not a tile');

    // Read through the repository so the public policy decides: a tile for an
    // unpublished tour must not be reachable by anyone who guesses the path.
    const prefix = await this.tours.publicTilePrefix(coords.data.sceneId);
    if (!prefix) throw new NotFoundException('No such tile');

    const url = await this.storage.createReadUrl(
      `${prefix}/${coords.data.level}/${coords.data.x}_${coords.data.y}.webp`,
    );
    return { url, statusCode: 302 };
  }

  private async signed(path: string | null): Promise<string | null> {
    if (!path) return null;
    // A missing signature must not take the whole tour down: the viewer can
    // still open the room from its tiles.
    return this.storage.createReadUrl(path).catch(() => null);
  }
}

export type { Tour };
