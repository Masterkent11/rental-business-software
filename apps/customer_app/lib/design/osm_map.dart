import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'tokens.dart';

class TilePoint {
  const TilePoint(this.x, this.y);

  final double x;
  final double y;
}

TilePoint tileFor(double latitude, double longitude, int zoom) {
  final n = math.pow(2, zoom).toDouble();
  final x = (longitude + 180) / 360 * n;
  final latRad = latitude * math.pi / 180;
  final y = (1 - math.log(math.tan(latRad) + 1 / math.cos(latRad)) / math.pi) / 2 * n;
  return TilePoint(x, y);
}

double metresPerPixel(double latitude, int zoom) =>
    156543.03392 * math.cos(latitude * math.pi / 180) / math.pow(2, zoom);

class OsmMap extends StatelessWidget {
  const OsmMap({
    required this.latitude,
    required this.longitude,
    required this.approximate,
    this.zoom = 15,
    this.height = 240,
    super.key,
  });

  final double latitude;
  final double longitude;
  final bool approximate;
  final int zoom;
  final double height;

  static const double _tile = 256;
  static const Map<String, String> _headers = {'User-Agent': 'RentalPlatformCustomerApp/0.1'};

  @override
  Widget build(BuildContext context) {
    final center = tileFor(latitude, longitude, zoom);
    final max = math.pow(2, zoom).toInt();
    return ClipRRect(
      borderRadius: BorderRadius.circular(Tokens.rMd),
      child: SizedBox(
        height: height,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final originX = center.x * _tile - width / 2;
            final originY = center.y * _tile - height / 2;
            final firstX = (originX / _tile).floor();
            final firstY = (originY / _tile).floor();
            final lastX = ((originX + width) / _tile).floor();
            final lastY = ((originY + height) / _tile).floor();
            final radiusPx = approximate ? 600 / metresPerPixel(latitude, zoom) : 0.0;
            return Stack(
              children: [
                const Positioned.fill(child: ColoredBox(color: Color(0xFFE8EAED))),
                for (var tx = firstX; tx <= lastX; tx++)
                  for (var ty = firstY; ty <= lastY; ty++)
                    if (ty >= 0 && ty < max)
                      Positioned(
                        left: tx * _tile - originX,
                        top: ty * _tile - originY,
                        width: _tile,
                        height: _tile,
                        child: Image.network(
                          'https://tile.openstreetmap.org/$zoom/${((tx % max) + max) % max}/$ty.png',
                          headers: _headers,
                          fit: BoxFit.cover,
                          gaplessPlayback: true,
                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                        ),
                      ),
                if (approximate)
                  Positioned(
                    left: width / 2 - radiusPx,
                    top: height / 2 - radiusPx,
                    width: radiusPx * 2,
                    height: radiusPx * 2,
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Tokens.primaryNavy.withValues(alpha: 0.14),
                          border: Border.all(color: Tokens.primaryNavy.withValues(alpha: 0.5), width: 1.5),
                        ),
                      ),
                    ),
                  )
                else
                  Positioned(
                    left: width / 2 - 16,
                    top: height / 2 - 32,
                    child: const Icon(Icons.location_on, size: 32, color: Tokens.primaryNavy),
                  ),
                Positioned(
                  right: 6,
                  bottom: 4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    color: Colors.white.withValues(alpha: 0.8),
                    child: const Text('© OpenStreetMap contributors', style: TextStyle(fontSize: 9.5, color: Colors.black87)),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
