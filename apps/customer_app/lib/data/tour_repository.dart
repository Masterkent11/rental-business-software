import 'dart:ui' as ui;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'listing_repository.dart';

class TourHotspotView {
  const TourHotspotView({
    required this.id,
    required this.kind,
    required this.yaw,
    required this.pitch,
    required this.label,
    required this.targetSceneId,
  });

  final String id;

  final String kind;

  final double yaw;
  final double pitch;
  final String label;

  final String? targetSceneId;

  bool get isDoor => kind == 'NAVIGATION' && targetSceneId != null;
}

class TourSceneApiView {
  const TourSceneApiView({
    required this.id,
    required this.label,
    required this.position,
    required this.previewUrl,
    required this.thumbnailUrl,
    required this.tileUrlTemplate,
    required this.tileLevels,
    required this.hotspots,
  });

  final String id;
  final String label;
  final int position;

  final String? previewUrl;
  final String? thumbnailUrl;

  final String? tileUrlTemplate;
  final int tileLevels;

  final List<TourHotspotView> hotspots;

  bool get isWalkable =>
      previewUrl != null || (tileUrlTemplate != null && tileLevels > 0);

  String? tileUrl({required int level, required int x, required int y}) {
    final template = tileUrlTemplate;
    if (template == null) return null;
    return template
        .replaceFirst('{level}', '$level')
        .replaceFirst('{x}', '$x')
        .replaceFirst('{y}', '$y');
  }
}

class TourView {
  const TourView({
    required this.id,
    required this.resourceId,
    required this.entrySceneId,
    required this.scenes,
  });

  final String id;
  final String resourceId;

  final String entrySceneId;
  final List<TourSceneApiView> scenes;

  TourSceneApiView? sceneById(String id) {
    for (final scene in scenes) {
      if (scene.id == id) return scene;
    }
    return null;
  }

  TourSceneApiView? get entryScene =>
      sceneById(entrySceneId) ?? scenes.firstOrNull;
}

class TourRepository {
  TourRepository(this._api);

  final ApiClient _api;

  Future<TourView?> forResource(String resourceId) async {
    try {
      final json = await _api.getJson('/resources/$resourceId/tour');

      final scenes = (json['scenes'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map((scene) => _toScene(scene, _api.baseUrl))
          .toList(growable: false);

      if (scenes.isEmpty) return null;

      return TourView(
        id: json['id'] as String,
        resourceId: json['resourceId'] as String? ?? resourceId,
        entrySceneId: json['entrySceneId'] as String? ?? scenes.first.id,
        scenes: scenes,
      );
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  static TourSceneApiView _toScene(Map<String, dynamic> json, String baseUrl) {
    final template = json['tileUrlTemplate'] as String?;

    return TourSceneApiView(
      id: json['id'] as String,
      label: json['label'] as String? ?? '',
      position: (json['position'] as num?)?.toInt() ?? 0,
      previewUrl: json['previewUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      tileUrlTemplate: template == null ? null : '$baseUrl$template',
      tileLevels: (json['tileLevels'] as num?)?.toInt() ?? 0,
      hotspots: (json['hotspots'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(
            (h) => TourHotspotView(
              id: h['id'] as String,
              kind: h['kind'] as String? ?? 'INFO',
              yaw: (h['yaw'] as num?)?.toDouble() ?? 0,
              pitch: (h['pitch'] as num?)?.toDouble() ?? 0,
              label: h['label'] as String? ?? '',
              targetSceneId: h['targetSceneId'] as String?,
            ),
          )
          .toList(growable: false),
    );
  }
}

final panoramaImageLoaderProvider = Provider<PanoramaImageLoader?>(
  (ref) => null,
);

typedef PanoramaImageLoader = Future<ui.Image> Function(String url);

final tourRepositoryProvider = Provider<TourRepository>(
  (ref) => TourRepository(ref.watch(apiClientProvider)),
);

final tourProvider = FutureProvider.family<TourView?, String>(
  (ref, resourceId) =>
      ref.watch(tourRepositoryProvider).forResource(resourceId),
);
