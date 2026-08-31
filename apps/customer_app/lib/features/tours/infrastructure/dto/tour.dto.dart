import '../../domain/entities/tour_hotspot.entity.dart';

/// DTO for raw tour data from `/tours/resource/:resourceId`.
class TourDto {
  const TourDto({
    required this.id,
    required this.resourceId,
    required this.entrySceneId,
    required this.scenes,
  });

  factory TourDto.fromJson(Map<String, dynamic> json) {
    final rawScenes = json['scenes'] as List<dynamic>? ?? [];
    final scenes = rawScenes
        .whereType<Map<String, dynamic>>()
        .map((s) => TourSceneDto.fromJson(s))
        .toList();

    return TourDto(
      id: json['id'] as String? ?? '',
      resourceId: json['resourceId'] as String? ?? '',
      entrySceneId: json['entrySceneId'] as String? ?? '',
      scenes: scenes,
    );
  }

  final String id;
  final String resourceId;
  final String entrySceneId;
  final List<TourSceneDto> scenes;
}

class TourSceneDto {
  const TourSceneDto({
    required this.id,
    required this.label,
    required this.position,
    this.previewUrl,
    this.thumbnailUrl,
    this.tileUrlTemplate,
    this.tileLevels = 0,
    this.hotspots = const [],
  });

  factory TourSceneDto.fromJson(Map<String, dynamic> json) {
    final rawHotspots = json['hotspots'] as List<dynamic>? ?? [];
    final hotspots = rawHotspots
        .whereType<Map<String, dynamic>>()
        .map((h) => TourHotspotDto.fromJson(h))
        .toList();

    return TourSceneDto(
      id: json['id'] as String? ?? '',
      label: json['label'] as String? ?? json['name'] as String? ?? '',
      position: json['position'] as int? ?? json['sortOrder'] as int? ?? 0,
      previewUrl: json['previewUrl'] as String? ?? json['imageUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      tileUrlTemplate: json['tileUrlTemplate'] as String?,
      tileLevels: json['tileLevels'] as int? ?? 0,
      hotspots: hotspots,
    );
  }

  final String id;
  final String label;
  final int position;
  final String? previewUrl;
  final String? thumbnailUrl;
  final String? tileUrlTemplate;
  final int tileLevels;
  final List<TourHotspotDto> hotspots;
}

class TourHotspotDto {
  const TourHotspotDto({
    required this.id,
    required this.kind,
    required this.yaw,
    required this.pitch,
    this.targetSceneId,
    this.title,
    this.description,
  });

  factory TourHotspotDto.fromJson(Map<String, dynamic> json) {
    final kindStr = json['kind'] as String? ?? 'NAVIGATION';
    final kind = switch (kindStr.toUpperCase()) {
      'INFO' => HotspotKind.info,
      'IMAGE' => HotspotKind.image,
      'VIDEO' => HotspotKind.video,
      _ => HotspotKind.navigation,
    };

    return TourHotspotDto(
      id: json['id'] as String? ?? '',
      kind: kind,
      yaw: (json['yaw'] as num?)?.toDouble() ?? 0.0,
      pitch: (json['pitch'] as num?)?.toDouble() ?? 0.0,
      targetSceneId: json['targetSceneId'] as String?,
      title: json['title'] as String? ?? json['label'] as String?,
      description: json['description'] as String? ?? json['note'] as String?,
    );
  }

  final String id;
  final HotspotKind kind;
  final double yaw;
  final double pitch;
  final String? targetSceneId;
  final String? title;
  final String? description;
}
