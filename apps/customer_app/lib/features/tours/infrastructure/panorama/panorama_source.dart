import 'dart:async';
import 'dart:ui' as ui;

import '../../domain/entities/tour_scene.entity.dart';
import '../../domain/value_objects/panorama_quality.value_object.dart';

class PanoramaSource {
  PanoramaSource({
    required this.scene,
    required this.loader,
  });

  final TourScene scene;
  final Future<ui.Image> Function(String url) loader;

  bool hasPixels = false;
  PanoramaQuality? quality;
  int level = 0;
  Object? error;

  Future<void> start() async {
    try {
      if (scene.previewUrl != null) {
        await loader(scene.previewUrl!);
        hasPixels = true;
        quality = PanoramaQuality.preview;
      }

      if (scene.tileLevels > 0 && scene.tileUrlTemplate != null) {
        // Load level 0 (2 tiles: x=0,1; y=0)
        final url0 = scene.tileUrl(level: 0, x: 0, y: 0);
        final url1 = scene.tileUrl(level: 0, x: 1, y: 0);
        if (url0 != null) await loader(url0);
        if (url1 != null) await loader(url1);

        hasPixels = true;
        quality = PanoramaQuality.tiles;
        level = 0;
      }
    } catch (e) {
      if (!hasPixels) {
        error = e;
      }
    }
  }

  Future<void> ensureLevel(int nextLevel) async {
    if (nextLevel <= level) return;
    try {
      final url = scene.tileUrl(level: nextLevel, x: 0, y: 0);
      if (url != null) {
        await loader(url);
        level = nextLevel;
      }
    } catch (_) {}
  }

  void dispose() {}
}
