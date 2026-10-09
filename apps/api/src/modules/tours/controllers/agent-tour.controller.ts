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
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { z } from 'zod';
import {
  ADD_OWNER_HOTSPOT,
  ADD_OWNER_SCENE_WITH_PANORAMA,
  CONFIGURE_TOUR_PROVIDER,
  ENSURE_LISTING_TOUR,
  GET_OWNER_TOUR_WITH_READINESS,
  PUBLISH_OWNER_TOUR,
  REMOVE_OWNER_HOTSPOT,
  REMOVE_TOUR_SCENE,
  RENAME_OWNER_SCENE,
  REORDER_OWNER_SCENES,
  SET_OWNER_ENTRY_SCENE,
  SET_SCENE_VIEW,
  UNPUBLISH_OWNER_TOUR,
  UPDATE_TOUR_HOTSPOT,
} from '@/modules/tours/tour.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { getOwnerTourWithReadiness } from '@/application/tours/get-owner-tour/get-owner-tour.use-case.ts';
import type { addOwnerSceneWithPanorama } from '@/application/tours/add-scene/add-scene.use-case.ts';
import type { reorderOwnerScenes } from '@/application/tours/reorder-scenes/reorder-scenes.use-case.ts';
import type { renameOwnerScene } from '@/application/tours/rename-scene/rename-scene.use-case.ts';
import type { setOwnerEntryScene } from '@/application/tours/set-entry-scene/set-entry-scene.use-case.ts';
import type { addOwnerHotspot } from '@/application/tours/add-hotspot/add-hotspot.use-case.ts';
import type { removeOwnerHotspot } from '@/application/tours/remove-hotspot/remove-hotspot.use-case.ts';
import type { publishOwnerTour } from '@/application/tours/publish-tour/publish-tour.use-case.ts';
import type { unpublishOwnerTour } from '@/application/tours/unpublish-tour/unpublish-tour.use-case.ts';
import type { updateTourHotspot } from '@/application/tours/update-hotspot/update-hotspot.use-case.ts';
import type { setSceneView } from '@/application/tours/set-scene-view/set-scene-view.use-case.ts';
import type { removeTourScene } from '@/application/tours/remove-scene/remove-scene.use-case.ts';
import type { configureTourProvider } from '@/application/tours/configure-tour-provider/configure-tour-provider.use-case.ts';
import type { ensureListingTour } from '@/application/tours/ensure-listing-tour/ensure-listing-tour.use-case.ts';
import {
  addHotspotSchema,
  addSceneSchema,
  renameSceneSchema,
  reorderScenesSchema,
  sceneViewSchema,
  setEntrySceneSchema,
  tourProviderSchema,
  updateHotspotSchema,
} from '@/modules/tours/dto/tour.dto.ts';
import {
  toSceneHttpResponse,
  toTourHttpResponse,
} from '@/modules/tours/mappers/tour-http.mapper.ts';

const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new BadRequestException(`${where}${issue?.message ?? 'Invalid request'}`);
  }
  return parsed.data;
};

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new BadRequestException(`Not a valid ${what} id`);
  return value;
};

const bearer = (header: string | undefined) => header?.replace(/^Bearer\s+/i, '').trim() || null;

const decodePanorama = (base64: string): Buffer => {
  const panorama = Buffer.from(base64, 'base64');
  if (panorama.byteLength === 0) throw new BadRequestException('That upload was empty');
  return panorama;
};

@Controller('agent')
export class AgentTourController {
  constructor(
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
    @Inject(UPDATE_TOUR_HOTSPOT)
    private readonly updateHotspotUseCase: ReturnType<typeof updateTourHotspot>,
    @Inject(SET_SCENE_VIEW)
    private readonly setSceneViewUseCase: ReturnType<typeof setSceneView>,
    @Inject(REMOVE_TOUR_SCENE)
    private readonly removeSceneUseCase: ReturnType<typeof removeTourScene>,
    @Inject(CONFIGURE_TOUR_PROVIDER)
    private readonly configureProviderUseCase: ReturnType<typeof configureTourProvider>,
    @Inject(ENSURE_LISTING_TOUR)
    private readonly ensureListingTourUseCase: ReturnType<typeof ensureListingTour>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: null });
  }

  @Post('listings/:listingId/tour')
  async ensureForListing(
    @Param('listingId') listingId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(auth);
    const result = await this.ensureListingTourUseCase({ principal, organizationId: null, listingId: guid(listingId, 'listing') });
    return { ...toTourHttpResponse(result.tour, result.media), ...result.readiness };
  }

  @Get('tours/:tourId')
  async read(
    @Param('tourId') tourId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(auth);
    const result = await this.getTourUseCase({ principal, organizationId: null, tourId: guid(tourId, 'tour') });
    if (!result) throw new NotFoundException('No such tour');
    return { ...toTourHttpResponse(result.tour, result.media), ...result.readiness };
  }

  @Put('tours/:tourId/provider')
  async provider(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const dto = parse(tourProviderSchema, body);
    const principal = await this.principal(auth);
    const tour = await this.configureProviderUseCase({
      principal,
      organizationId: null,
      tourId: guid(tourId, 'tour'),
      provider: dto.provider,
      matterport: dto.matterport,
    });
    return toTourHttpResponse(tour);
  }

  @Post('tours/:tourId/scenes')
  async addScene(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const dto = parse(addSceneSchema, body);
    const principal = await this.principal(auth);
    const scene = await this.addSceneUseCase({
      principal,
      organizationId: null,
      tourId: guid(tourId, 'tour'),
      label: dto.label,
      panorama: decodePanorama(dto.panoramaBase64),
      accessToken: bearer(auth),
    });
    return toSceneHttpResponse(scene);
  }

  @Put('tours/:tourId/scenes/order')
  async reorder(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const dto = parse(reorderScenesSchema, body);
    const principal = await this.principal(auth);
    await this.reorderScenesUseCase({ principal, organizationId: null, tourId: guid(tourId, 'tour'), sceneIdsInOrder: dto.sceneIds });
    return { ok: true };
  }

  @Put('tours/:tourId/scenes/:sceneId')
  async rename(
    @Param('tourId') tourId: string,
    @Param('sceneId') sceneId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const dto = parse(renameSceneSchema, body);
    const principal = await this.principal(auth);
    const scene = await this.renameSceneUseCase({
      principal,
      organizationId: null,
      tourId: guid(tourId, 'tour'),
      sceneId: guid(sceneId, 'room'),
      label: dto.label,
    });
    return toSceneHttpResponse(scene);
  }

  @Put('tours/:tourId/scenes/:sceneId/view')
  async view(
    @Param('tourId') tourId: string,
    @Param('sceneId') sceneId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const dto = parse(sceneViewSchema, body);
    const principal = await this.principal(auth);
    await this.setSceneViewUseCase({
      principal,
      organizationId: null,
      tourId: guid(tourId, 'tour'),
      sceneId: guid(sceneId, 'room'),
      ...dto,
    });
    return { ok: true };
  }

  @Delete('tours/:tourId/scenes/:sceneId')
  async removeScene(
    @Param('tourId') tourId: string,
    @Param('sceneId') sceneId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(auth);
    return this.removeSceneUseCase({
      principal,
      organizationId: null,
      tourId: guid(tourId, 'tour'),
      sceneId: guid(sceneId, 'room'),
      accessToken: bearer(auth),
    });
  }

  @Put('tours/:tourId/entry')
  async setEntry(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const dto = parse(setEntrySceneSchema, body);
    const principal = await this.principal(auth);
    await this.setEntrySceneUseCase({ principal, organizationId: null, tourId: guid(tourId, 'tour'), sceneId: dto.sceneId });
    return { ok: true };
  }

  @Post('tours/:tourId/scenes/:sceneId/hotspots')
  async addHotspot(
    @Param('tourId') tourId: string,
    @Param('sceneId') sceneId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const dto = parse(addHotspotSchema, body);
    if (dto.kind === 'NAVIGATION' && !dto.targetSceneId) throw new BadRequestException('A door needs a room to lead to');
    if (dto.kind === 'INFO' && dto.targetSceneId) throw new BadRequestException('A note does not lead anywhere');
    const principal = await this.principal(auth);
    return this.addHotspotUseCase({
      principal,
      organizationId: null,
      tourId: guid(tourId, 'tour'),
      sceneId: guid(sceneId, 'room'),
      kind: dto.kind,
      yaw: dto.yaw,
      pitch: dto.pitch,
      label: dto.label,
      targetSceneId: dto.targetSceneId,
    });
  }

  @Patch('tours/:tourId/hotspots/:hotspotId')
  async updateHotspot(
    @Param('tourId') tourId: string,
    @Param('hotspotId') hotspotId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const dto = parse(updateHotspotSchema, body);
    const principal = await this.principal(auth);
    await this.updateHotspotUseCase({
      principal,
      organizationId: null,
      tourId: guid(tourId, 'tour'),
      hotspotId: guid(hotspotId, 'hotspot'),
      ...dto,
    });
    return { ok: true };
  }

  @Delete('tours/:tourId/hotspots/:hotspotId')
  async removeHotspot(
    @Param('tourId') tourId: string,
    @Param('hotspotId') hotspotId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(auth);
    await this.removeHotspotUseCase({ principal, organizationId: null, tourId: guid(tourId, 'tour'), hotspotId: guid(hotspotId, 'hotspot') });
    return { ok: true };
  }

  @Post('tours/:tourId/publish')
  async publish(
    @Param('tourId') tourId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(auth);
    const tour = await this.publishTourUseCase({ principal, organizationId: null, tourId: guid(tourId, 'tour') });
    return toTourHttpResponse(tour);
  }

  @Post('tours/:tourId/unpublish')
  async unpublish(
    @Param('tourId') tourId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(auth);
    const tour = await this.unpublishTourUseCase({ principal, organizationId: null, tourId: guid(tourId, 'tour') });
    return toTourHttpResponse(tour);
  }
}
