import '../../domain/entities/tour.entity.dart';
import '../dto/tour.dto.dart';

extension TourMapper on TourDto {
  Tour toDomain() => Tour(
        id: id,
        resourceId: resourceId,
        entrySceneId: entrySceneId,
        scenes: scenes.map((s) => s.toDomain()).toList(),
      );
}

extension TourSceneMapper on TourSceneDto {
  TourScene toDomain() => TourScene(
        id: id,
        label: label,
        position: position,
        previewUrl: previewUrl,
        thumbnailUrl: thumbnailUrl,
        tileUrlTemplate: tileUrlTemplate,
        tileLevels: tileLevels,
        hotspots: hotspots.map((h) => h.toDomain()).toList(),
      );
}

extension TourHotspotMapper on TourHotspotDto {
  TourHotspot toDomain() => TourHotspot(
        id: id,
        kind: kind,
        yaw: yaw,
        pitch: pitch,
        targetSceneId: targetSceneId,
        title: title,
        description: description,
      );
}
