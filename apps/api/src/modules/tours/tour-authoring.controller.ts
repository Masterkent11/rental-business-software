import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { MEDIA_STORAGE, PANORAMA_PROCESSOR, TOUR_REPOSITORY } from './tour.tokens.ts';
import { RESOLVE_PRINCIPAL } from '../me/me.tokens.ts';
import {
  OrganizationForbiddenError,
  UnauthenticatedError,
  type resolvePrincipal,
} from '../../features/authenticate/resolve-principal.ts';
import {
  SceneNotFoundError,
  TourNotFoundError,
  type TourRepository,
} from '../../application/ports/tour-repository.ts';
import type { MediaStorage } from '../../application/ports/media-storage.ts';
import type { PanoramaProcessor } from '../../application/ports/panorama-processor.ts';
import {
  TourNotPublishableError,
  clampPitch,
  normaliseYaw,
  type Scene,
  type Tour,
} from '../../domain/tours/tour.ts';
import {
  addSceneWithPanorama,
  createTourForResource,
  publishTour,
  tourReadiness,
  unpublishTour,
} from '../../features/author-tour/author-tour.ts';
import { hasCapability, type Principal } from '../../domain/identity/capability.ts';

const angle = z.object({
  yaw: z.number().min(-360).max(360),
  pitch: z.number().min(-90).max(90),
});

/**
 * Owner authoring for tours.
 *
 * Writes go through the same repository the customer read uses, and publishing
 * goes through the same `assertPublishable`. There is no second validation path
 * here on purpose — a copy of I-07 in the authoring flow is the copy that
 * drifts.
 */
@Controller('organizations/:organizationId/tours')
export class TourAuthoringController {
  constructor(
    @Inject(TOUR_REPOSITORY) private readonly tours: TourRepository,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
    @Inject(PANORAMA_PROCESSOR) private readonly processor: PanoramaProcessor,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post()
  async createForResource(
    @Param('organizationId') organizationId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = z.object({ resourceId: z.guid() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException('Not a resource id');

    await this.owner(organizationId, auth);

    try {
      const tour = await createTourForResource(this.tours)({
        organizationId,
        resourceId: parsed.data.resourceId,
      });
      return toResponse(tour);
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Get(':tourId')
  async read(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Headers('authorization') auth?: string,
  ) {
    await this.owner(organizationId, auth);

    const tour = await this.tours.forOrganization(organizationId, tourId);
    if (!tour) throw new NotFoundException('No such tour');

    // The readiness list is served alongside, so the authoring screen can show
    // what is missing while the owner works rather than only when they publish.
    const readiness = await tourReadiness(this.tours)({ organizationId, tourId });
    return { ...toResponse(tour), ...readiness };
  }

  @Post(':tourId/scenes')
  async addScene(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = z
      .object({
        label: z.string().trim().min(1).max(80),
        // Base64 rather than multipart: one JSON contract for the whole API,
        // and a panorama is a handful of megabytes, not a video upload.
        panoramaBase64: z.string().min(1),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    await this.owner(organizationId, auth);

    let panorama: Buffer;
    try {
      panorama = Buffer.from(parsed.data.panoramaBase64, 'base64');
    } catch {
      throw new BadRequestException('That upload could not be decoded');
    }
    if (panorama.byteLength === 0) {
      throw new BadRequestException('That upload was empty');
    }

    try {
      const scene = await addSceneWithPanorama(
        this.tours,
        this.processor,
        this.storage,
      )({ organizationId, tourId, label: parsed.data.label, panorama });

      // A failed panorama is still a 201 with a FAILED room: the owner asked to
      // add a room and one exists, carrying the reason. Returning an error
      // would leave them with no record of what went wrong.
      return toScene(scene);
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Put(':tourId/scenes/order')
  async reorder(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = z
      .object({ sceneIds: z.array(z.guid()).min(1) })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException('Send the room ids in order');

    await this.owner(organizationId, auth);
    await this.tours.reorderScenes({
      organizationId,
      tourId,
      sceneIdsInOrder: parsed.data.sceneIds,
    });
    return { ok: true };
  }

  @Put(':tourId/scenes/:sceneId')
  async rename(
    @Param('organizationId') organizationId: string,
    @Param('sceneId') sceneId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = z
      .object({ label: z.string().trim().min(1).max(80) })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException('A room needs a name');

    await this.owner(organizationId, auth);

    try {
      return toScene(
        await this.tours.renameScene({
          organizationId,
          sceneId,
          label: parsed.data.label,
        }),
      );
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Put(':tourId/entry')
  async setEntry(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = z.object({ sceneId: z.guid() }).safeParse(body);
    if (!parsed.success) throw new BadRequestException('Not a room id');

    await this.owner(organizationId, auth);

    try {
      await this.tours.setEntryScene({
        organizationId,
        tourId,
        sceneId: parsed.data.sceneId,
      });
      return { ok: true };
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Post(':tourId/scenes/:sceneId/hotspots')
  async addHotspot(
    @Param('organizationId') organizationId: string,
    @Param('sceneId') sceneId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = angle
      .extend({
        kind: z.enum(['NAVIGATION', 'INFO']),
        label: z.string().trim().max(120).default(''),
        targetSceneId: z.guid().nullable().default(null),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const { kind, targetSceneId } = parsed.data;
    if (kind === 'NAVIGATION' && !targetSceneId) {
      throw new BadRequestException('A door needs a room to lead to');
    }
    if (kind === 'INFO' && targetSceneId) {
      throw new BadRequestException('A note does not lead anywhere');
    }

    await this.owner(organizationId, auth);

    try {
      const id = await this.tours.addHotspot({
        organizationId,
        sceneId,
        kind,
        // Normalised at the edge so the stored angle is always canonical —
        // 190° and -170° are the same bearing and must not compare unequal.
        yaw: normaliseYaw(parsed.data.yaw),
        pitch: clampPitch(parsed.data.pitch),
        label: parsed.data.label,
        targetSceneId: kind === 'NAVIGATION' ? targetSceneId : null,
      });
      return { id };
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Delete(':tourId/hotspots/:hotspotId')
  async removeHotspot(
    @Param('organizationId') organizationId: string,
    @Param('hotspotId') hotspotId: string,
    @Headers('authorization') auth?: string,
  ) {
    await this.owner(organizationId, auth);
    await this.tours.removeHotspot({ organizationId, hotspotId });
    return { ok: true };
  }

  @Post(':tourId/publish')
  async publish(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Headers('authorization') auth?: string,
  ) {
    await this.owner(organizationId, auth);

    try {
      return toResponse(await publishTour(this.tours)({ organizationId, tourId }));
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Post(':tourId/unpublish')
  async unpublish(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Headers('authorization') auth?: string,
  ) {
    await this.owner(organizationId, auth);
    await unpublishTour(this.tours)({ organizationId, tourId });
    return { ok: true };
  }

  private async owner(
    organizationId: string,
    authorization: string | undefined,
  ): Promise<Principal> {
    if (!z.guid().safeParse(organizationId).success) {
      throw new BadRequestException('Not an organization id');
    }

    let principal: Principal;
    try {
      principal = await this.resolve({ authorization, organizationId });
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        throw new UnauthorizedException(error.message);
      }
      if (error instanceof OrganizationForbiddenError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }

    const allowed =
      hasCapability(principal, 'OWNER', organizationId) ||
      hasCapability(principal, 'STAFF', organizationId);
    if (!allowed) {
      throw new ForbiddenException('You may not author tours here');
    }
    return principal;
  }

  private translate(error: unknown): Error {
    if (error instanceof TourNotPublishableError) {
      // 409: the tour exists and the request was well formed; the tour is not
      // in a state where publishing means anything yet.
      return new ConflictException(error.message);
    }
    if (error instanceof SceneNotFoundError) {
      return new BadRequestException(error.message);
    }
    if (error instanceof TourNotFoundError) {
      return new NotFoundException(error.message);
    }
    return error as Error;
  }
}

const toScene = (scene: Scene) => ({
  id: scene.id,
  label: scene.label,
  position: scene.position,
  state: scene.state,
  failureReason: scene.failureReason,
  tileLevels: scene.tileLevels,
  hotspots: scene.hotspots.map((hotspot) => ({
    id: hotspot.id,
    kind: hotspot.kind,
    yaw: hotspot.yaw,
    pitch: hotspot.pitch,
    label: hotspot.label,
    targetSceneId: hotspot.targetSceneId,
  })),
});

const toResponse = (tour: Tour) => ({
  id: tour.id,
  resourceId: tour.resourceId,
  state: tour.state,
  entrySceneId: tour.entrySceneId,
  scenes: tour.scenes.map(toScene),
});
