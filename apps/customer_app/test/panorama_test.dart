import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:customer_app/data/tour_repository.dart';
import 'package:customer_app/features/tour/panorama/panorama_source.dart';
import 'package:customer_app/features/tour/panorama/panorama_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _size = Size(400, 800);

/// A 1×1 image, enough to stand in for a decoded tile.
Future<ui.Image> pixel() {
  final completer = Completer<ui.Image>();
  ui.decodeImageFromPixels(
    Uint8List.fromList(const [255, 0, 0, 255]),
    1,
    1,
    ui.PixelFormat.rgba8888,
    completer.complete,
  );
  return completer.future;
}

TourSceneApiView scene({
  String? previewUrl = 'https://example.test/preview.webp',
  int tileLevels = 3,
  String? template = '/tiles/s-1/{level}/{x}/{y}',
}) =>
    TourSceneApiView(
      id: 's-1',
      label: 'Living room',
      position: 0,
      previewUrl: previewUrl,
      thumbnailUrl: null,
      tileUrlTemplate: template,
      tileLevels: tileLevels,
      hotspots: const [],
    );

void main() {
  group('the camera', () {
    test('wraps yaw so you can turn all the way round', () {
      const camera = PanoramaCamera();
      // Just past half a turn comes out the other side, not clamped.
      expect(
          camera.copyWith(yaw: math.pi * 1.5).yaw, closeTo(-math.pi / 2, 1e-9));
      expect(
          camera.copyWith(yaw: -math.pi * 1.5).yaw, closeTo(math.pi / 2, 1e-9));
    });

    test('clamps pitch instead of flipping you over', () {
      const camera = PanoramaCamera();
      // Looking past straight up should stop, not put you upside down.
      expect(camera.copyWith(pitch: math.pi).pitch, lessThan(math.pi / 2));
      expect(camera.copyWith(pitch: -math.pi).pitch, greaterThan(-math.pi / 2));
    });

    test('clamps the field of view at both ends', () {
      const camera = PanoramaCamera();
      expect(camera.copyWith(fov: 0.001).fov, PanoramaCamera.minFov);
      expect(camera.copyWith(fov: 10).fov, PanoramaCamera.maxFov);
    });

    test('reports zoom from wide to tight', () {
      expect(const PanoramaCamera(fov: PanoramaCamera.maxFov).zoom, 0);
      expect(const PanoramaCamera(fov: PanoramaCamera.minFov).zoom, 1);
    });
  });

  group('placing a hotspot', () {
    test('puts one straight ahead in the middle of the screen', () {
      final at = projectHotspot(
        yawDegrees: 0,
        pitchDegrees: 0,
        camera: const PanoramaCamera(),
        size: _size,
      );

      expect(at, isNotNull);
      expect(at!.dx, closeTo(_size.width / 2, 0.5));
      expect(at.dy, closeTo(_size.height / 2, 0.5));
    });

    test('hides one behind the customer', () {
      // A door behind you is not drawn over the wall in front of you.
      final at = projectHotspot(
        yawDegrees: 180,
        pitchDegrees: 0,
        camera: const PanoramaCamera(),
        size: _size,
      );

      expect(at, isNull);
    });

    test('follows the camera as the customer turns', () {
      const right = 30.0;
      final ahead = projectHotspot(
        yawDegrees: right,
        pitchDegrees: 0,
        camera: const PanoramaCamera(),
        size: _size,
      );
      // Turn to face it: it should move toward the centre.
      final facing = projectHotspot(
        yawDegrees: right,
        pitchDegrees: 0,
        camera: const PanoramaCamera(yaw: right * math.pi / 180),
        size: _size,
      );

      expect(ahead!.dx, greaterThan(_size.width / 2));
      expect(facing!.dx, closeTo(_size.width / 2, 0.5));
    });

    test('puts one above the horizon higher up the screen', () {
      final up = projectHotspot(
        yawDegrees: 0,
        pitchDegrees: 20,
        camera: const PanoramaCamera(),
        size: _size,
      );

      expect(up!.dy, lessThan(_size.height / 2));
    });
  });

  group('progressive loading', () {
    test('shows the preview before any tile', () async {
      final requested = <String>[];
      final source = PanoramaSource(
        scene: scene(),
        loader: (url) async {
          requested.add(url);
          // Tiles never resolve, so only the preview can have painted.
          if (url.startsWith('/tiles/')) return Completer<ui.Image>().future;
          return pixel();
        },
      );
      addTearDown(source.dispose);

      unawaited(source.start());
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(source.hasPixels, isTrue);
      expect(source.quality, PanoramaQuality.preview);
      expect(requested.first, contains('preview'));
    });

    test('never fetches the full-size source panorama', () async {
      // The 4.4 MB original exists so tiles can be regenerated later.
      // Downloading it to look at a room would defeat the whole pipeline.
      final requested = <String>[];
      final source = PanoramaSource(
        scene: scene(),
        loader: (url) async {
          requested.add(url);
          return pixel();
        },
      );
      addTearDown(source.dispose);

      await source.start();

      expect(requested.any((url) => url.contains('/source')), isFalse);
    });

    test('refines to tiles once they arrive', () async {
      final source = PanoramaSource(
        scene: scene(),
        loader: (_) async => pixel(),
      );
      addTearDown(source.dispose);

      await source.start();

      expect(source.quality, PanoramaQuality.tiles);
      // Level 0 only: sharper levels wait for the customer to zoom.
      expect(source.level, 0);
    });

    test('loads level 0 as two tiles, not the whole pyramid', () async {
      final requested = <String>[];
      final source = PanoramaSource(
        scene: scene(),
        loader: (url) async {
          requested.add(url);
          return pixel();
        },
      );
      addTearDown(source.dispose);

      await source.start();

      final tiles = requested.where((u) => u.startsWith('/tiles/')).toList();
      // 1024×512 at 512px tiles is two across, one down.
      expect(tiles, hasLength(2));
      // Level 0 only — the template is /tiles/{sceneId}/{level}/{x}/{y}.
      expect(tiles.every((u) => u.startsWith('/tiles/s-1/0/')), isTrue);
    });

    test('does not go backwards to a coarser level', () async {
      final source = PanoramaSource(
        scene: scene(),
        loader: (_) async => pixel(),
      );
      addTearDown(source.dispose);

      await source.start();
      await source.ensureLevel(2);
      expect(source.level, 2);

      // A slow level 1 finishing late must not blur the view again.
      await source.ensureLevel(1);
      expect(source.level, 2);
    });

    test('still shows the room when the preview is missing', () async {
      // A missing thumbnail must not cost the customer the whole room.
      final source = PanoramaSource(
        scene: scene(previewUrl: null),
        loader: (_) async => pixel(),
      );
      addTearDown(source.dispose);

      await source.start();

      expect(source.hasPixels, isTrue);
      expect(source.quality, PanoramaQuality.tiles);
    });

    test('keeps what is on screen when a refinement fails', () async {
      var calls = 0;
      final source = PanoramaSource(
        scene: scene(),
        loader: (url) async {
          calls += 1;
          if (url.startsWith('/tiles/s-1/1/')) throw Exception('offline');
          return pixel();
        },
      );
      addTearDown(source.dispose);

      await source.start();
      final before = source.level;

      await source.ensureLevel(1);

      // Level 0 survives; a failed refinement is not a failed room.
      expect(source.hasPixels, isTrue);
      expect(source.level, before);
      expect(calls, greaterThan(0));
    });

    test('reports an error only when there is nothing to show', () async {
      final source = PanoramaSource(
        scene: scene(),
        loader: (_) async => throw Exception('offline'),
      );
      addTearDown(source.dispose);

      await source.start();

      expect(source.hasPixels, isFalse);
      expect(source.error, isNotNull);
    });
  });

  group('the scene contract', () {
    test('builds tile URLs from the template', () {
      // The repository makes the template absolute before it gets here; the
      // scene only substitutes coordinates.
      expect(scene().tileUrl(level: 2, x: 3, y: 1), '/tiles/s-1/2/3/1');
    });

    test('is not walkable with neither preview nor tiles', () {
      expect(scene(previewUrl: null, template: null, tileLevels: 0).isWalkable,
          isFalse);
    });
  });
}
