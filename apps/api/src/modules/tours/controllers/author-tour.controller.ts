import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  CREATE_OWNER_TOUR_FOR_RESOURCE,
  GET_OWNER_TOUR_WITH_READINESS,
  ADD_OWNER_SCENE_WITH_PANORAMA,
  REORDER_OWNER_SCENES,
  RENAME_OWNER_SCENE,
  SET_OWNER_ENTRY_SCENE,
  ADD_OWNER_HOTSPOT,
  REMOVE_OWNER_HOTSPOT,
  PUBLISH_OWNER_TOUR,
  UNPUBLISH_OWNER_TOUR,
} from '@/modules/tours/tour.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { createOwnerTourForResource } from '@/application/tours/create-owner-tour/create-owner-tour.use-case.ts';
import type { getOwnerTourWithReadiness } from '@/application/tours/get-owner-tour/get-owner-tour.use-case.ts';
import type { addOwnerSceneWithPanorama } from '@/application/tours/add-scene/add-scene.use-case.ts';
import type { reorderOwnerScenes } from '@/application/tours/reorder-scenes/reorder-scenes.use-case.ts';
import type { renameOwnerScene } from '@/application/tours/rename-scene/rename-scene.use-case.ts';
import type { setOwnerEntryScene } from '@/application/tours/set-entry-scene/set-entry-scene.use-case.ts';
import type { addOwnerHotspot } from '@/application/tours/add-hotspot/add-hotspot.use-case.ts';
import type { removeOwnerHotspot } from '@/application/tours/remove-hotspot/remove-hotspot.use-case.ts';
import type { publishOwnerTour } from '@/application/tours/publish-tour/publish-tour.use-case.ts';
import type { unpublishOwnerTour } from '@/application/tours/unpublish-tour/unpublish-tour.use-case.ts';
import {
  createTourSchema,
  addSceneSchema,
  reorderScenesSchema,
  renameSceneSchema,
  setEntrySceneSchema,
  addHotspotSchema,
} from '@/modules/tours/dto/tour.dto.ts';
import {
  toSceneHttpResponse,
  toTourHttpResponse,
} from '@/modules/tours/mappers/tour-http.mapper.ts';

@Controller('organizations/:organizationId/tours')
export class AuthorTourController {
  constructor(
    @Inject(CREATE_OWNER_TOUR_FOR_RESOURCE)
    private readonly createTourUseCase: ReturnType<typeof createOwnerTourForResource>,
    @Inject(GET_OWNER_TOUR_WITH_READINESS)
    private readonly getTourUseCase: ReturnType<typeof getOwnerTourWithReadiness>,
    @Inject(ADD_OWNER_SCENE_WITH_PANORAMA)
    private readonly addSceneUseCase: ReturnType<typeof addOwnerSceneWithPanorama>,
    @Inject(REORDER_OWNER_SCENES)
    private readonly reorderScenesUseCase: ReturnType<typeof reorderOwnerScenes>,
    @Inject(RENAME_OWNER_SCENE)
    private readonly renameSceneUseCase: ReturnType<typeof renameOwnerScene>,
    @Inject(SET_OWNER_ENTRY_SCENE)
    private readonly setEntrySceneUseCase: ReturnType<typeof setOwnerEntryScene>,
    @Inject(ADD_OWNER_HOTSPOT)
    private readonly addHotspotUseCase: ReturnType<typeof addOwnerHotspot>,
    @Inject(REMOVE_OWNER_HOTSPOT)
    private readonly removeHotspotUseCase: ReturnType<typeof removeOwnerHotspot>,
    @Inject(PUBLISH_OWNER_TOUR)
    private readonly publishTourUseCase: ReturnType<typeof publishOwnerTour>,
    @Inject(UNPUBLISH_OWNER_TOUR)
    private readonly unpublishTourUseCase: ReturnType<typeof unpublishOwnerTour>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post()
  async createForResource(
    @Param('organizationId') organizationId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = createTourSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Not a resource id');

    const principal = await this.resolve({ authorization: auth, organizationId });
    const tour = await this.createTourUseCase({
      principal,
      organizationId,
      resourceId: parsed.data.resourceId,
    });
    return toTourHttpResponse(tour);
  }

  @Get(':tourId')
  async read(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.resolve({ authorization: auth, organizationId });
    const result = await this.getTourUseCase({ principal, organizationId, tourId });
    if (!result) throw new NotFoundException('No such tour');

    return { ...toTourHttpResponse(result.tour), ...result.readiness };
  }

  @Post(':tourId/scenes')
  async addScene(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = addSceneSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.resolve({ authorization: auth, organizationId });

    let panorama: Buffer;
    try {
      panorama = Buffer.from(parsed.data.panoramaBase64, 'base64');
    } catch {
      throw new BadRequestException('That upload could not be decoded');
    }
    if (panorama.byteLength === 0) {
      throw new BadRequestException('That upload was empty');
    }

    const scene = await this.addSceneUseCase({
      principal,
      organizationId,
      tourId,
      label: parsed.data.label,
      panorama,
    });
    return toSceneHttpResponse(scene);
  }

  @Put(':tourId/scenes/order')
  async reorder(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = reorderScenesSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Send the room ids in order');

    const principal = await this.resolve({ authorization: auth, organizationId });
    await this.reorderScenesUseCase({
      principal,
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
    const parsed = renameSceneSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('A room needs a name');

    const principal = await this.resolve({ authorization: auth, organizationId });
    const scene = await this.renameSceneUseCase({
      principal,
      organizationId,
      sceneId,
      label: parsed.data.label,
    });
    return toSceneHttpResponse(scene);
  }

  @Put(':tourId/entry')
  async setEntry(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = setEntrySceneSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Not a room id');

    const principal = await this.resolve({ authorization: auth, organizationId });
    await this.setEntrySceneUseCase({
      principal,
      organizationId,
      tourId,
      sceneId: parsed.data.sceneId,
    });
    return { ok: true };
  }

  @Post(':tourId/scenes/:sceneId/hotspots')
  async addHotspot(
    @Param('organizationId') organizationId: string,
    @Param('sceneId') sceneId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = addHotspotSchema.safeParse(body);
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

    const principal = await this.resolve({ authorization: auth, organizationId });
    return this.addHotspotUseCase({
      principal,
      organizationId,
      sceneId,
      kind,
      yaw: parsed.data.yaw,
      pitch: parsed.data.pitch,
      label: parsed.data.label,
      targetSceneId: kind === 'NAVIGATION' ? targetSceneId : null,
    });
  }

  @Delete(':tourId/hotspots/:hotspotId')
  async removeHotspot(
    @Param('organizationId') organizationId: string,
    @Param('hotspotId') hotspotId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.resolve({ authorization: auth, organizationId });
    await this.removeHotspotUseCase({
      principal,
      organizationId,
      hotspotId,
    });
    return { ok: true };
  }

  @Post(':tourId/publish')
  async publish(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.resolve({ authorization: auth, organizationId });
    const tour = await this.publishTourUseCase({
      principal,
      organizationId,
      tourId,
    });
    return toTourHttpResponse(tour);
  }

  @Post(':tourId/unpublish')
  async unpublish(
    @Param('organizationId') organizationId: string,
    @Param('tourId') tourId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.resolve({ authorization: auth, organizationId });
    await this.unpublishTourUseCase({
      principal,
      organizationId,
      tourId,
    });
    return { ok: true };
  }
}
