import 'dart:ui' as ui;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'listing_repository.dart';

/// One door or note placed on the sphere.
///
/// Angles, not pixels: a hotspot sits at a bearing in the room, so it stays
/// where the owner put it however the customer is looking or how far they have
/// zoomed in.
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

  /// `NAVIGATION` walks to another room; `INFO` just says something.
  final String kind;

  /// Degrees. Yaw wraps at ±180; pitch is clamped at ±90.
  final double yaw;
  final double pitch;
  final String label;

  /// The room this door leads to. Null for a note.
  final String? targetSceneId;

  bool get isDoor => kind == 'NAVIGATION' && targetSceneId != null;
}

/// One room, and everything needed to paint it.
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

  /// Kilobytes. What the customer sees first, before any tile arrives.
  final String? previewUrl;
  final String? thumbnailUrl;

  /// `/tiles/{sceneId}/{level}/{x}/{y}` with the placeholders left in — the
  /// full pyramid is thousands of URLs and sending them all would cost more
  /// than the tiles actually looked at.
  final String? tileUrlTemplate;
  final int tileLevels;

  final List<TourHotspotView> hotspots;

  /// A room the viewer can actually open. Mirrors the server's own rule.
  bool get isWalkable =>
      previewUrl != null || (tileUrlTemplate != null && tileLevels > 0);

  /// The URL for one tile at one level.
  String? tileUrl({required int level, required int x, required int y}) {
    final template = tileUrlTemplate;
    if (template == null) return null;
    return template
        .replaceFirst('{level}', '$level')
        .replaceFirst('{x}', '$x')
        .replaceFirst('{y}', '$y');
  }
}

/// A property's walkthrough.
class TourView {
  const TourView({
    required this.id,
    required this.resourceId,
    required this.entrySceneId,
    required this.scenes,
  });

  final String id;
  final String resourceId;

  /// Where the walkthrough opens. The owner chose it; the viewer must not
  /// pick a room of its own accord.
  final String entrySceneId;
  final List<TourSceneApiView> scenes;

  TourSceneApiView? sceneById(String id) {
    for (final scene in scenes) {
      if (scene.id == id) return scene;
    }
    return null;
  }

  /// The room to open on, falling back only if the entry is somehow absent.
  TourSceneApiView? get entryScene =>
      sceneById(entrySceneId) ?? scenes.firstOrNull;
}

class TourRepository {
  TourRepository(this._api);

  final ApiClient _api;

  /// The published tour for a resource, or null when there is none.
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
      // No tour is an ordinary answer, not a failure: most listings have none.
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  static TourSceneApiView _toScene(Map<String, dynamic> json, String baseUrl) {
    // The API sends the tile template as a path. Made absolute here, because
    // the image loader resolves a bare path against the page origin — which on
    // web is the app, not the API, so every tile would 404.
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
          .map((h) => TourHotspotView(
                id: h['id'] as String,
                kind: h['kind'] as String? ?? 'INFO',
                yaw: (h['yaw'] as num?)?.toDouble() ?? 0,
                pitch: (h['pitch'] as num?)?.toDouble() ?? 0,
                label: h['label'] as String? ?? '',
                targetSceneId: h['targetSceneId'] as String?,
              ))
          .toList(growable: false),
    );
  }
}

/// How the viewer fetches and decodes one panorama image.
///
/// Injected rather than reached for directly: widget tests must not open real
/// sockets, and a viewer that hard-codes `NetworkImage` cannot be tested at
/// all. Production uses the default network loader.
final panoramaImageLoaderProvider =
    Provider<PanoramaImageLoader?>((ref) => null);

/// Signature shared with `PanoramaSource`, declared here so screens can depend
/// on the provider without importing the viewer internals.
typedef PanoramaImageLoader = Future<ui.Image> Function(String url);

final tourRepositoryProvider = Provider<TourRepository>(
  (ref) => TourRepository(ref.watch(apiClientProvider)),
);

/// The tour for one resource. Null means this place has none.
final tourProvider = FutureProvider.family<TourView?, String>(
  (ref, resourceId) =>
      ref.watch(tourRepositoryProvider).forResource(resourceId),
);
