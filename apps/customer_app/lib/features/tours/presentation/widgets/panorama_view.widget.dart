import 'package:flutter/material.dart';

import '../../../../core/design/app_image.dart';
import '../../../../core/design/tokens.dart';
import '../../domain/entities/tour_hotspot.entity.dart';
import '../../domain/entities/tour_scene.entity.dart';
import 'panorama_camera.widget.dart';

class PanoramaView extends StatefulWidget {
  const PanoramaView({
    required this.scene,
    required this.onHotspotTapped,
    super.key,
  });

  final TourScene scene;
  final void Function(TourHotspot hotspot) onHotspotTapped;

  @override
  State<PanoramaView> createState() => _PanoramaViewState();
}

class _PanoramaViewState extends State<PanoramaView> {
  PanoramaCamera _camera = const PanoramaCamera();

  void _onPanUpdate(DragUpdateDetails details, Size size) {
    setState(() {
      final deltaYaw = -(details.delta.dx / size.width) * _camera.fov;
      final deltaPitch = (details.delta.dy / size.height) * _camera.fov;
      _camera = _camera.copyWith(
        yaw: _camera.yaw + deltaYaw,
        pitch: _camera.pitch + deltaPitch,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.scene.previewUrl ?? widget.scene.thumbnailUrl;
    if (url == null || url.isEmpty) {
      return const Center(
        child: Text('No panorama image available for this scene'),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);

        return GestureDetector(
          onPanUpdate: (d) => _onPanUpdate(d, size),
          child: Stack(
            fit: StackFit.expand,
            children: [
              AppImage(
                url: url,
                fit: BoxFit.cover,
                width: double.infinity,
                height: double.infinity,
              ),
              for (final h in widget.scene.hotspots) ...[
                Builder(
                  builder: (context) {
                    final offset = projectHotspot(
                      yawDegrees: h.yaw,
                      pitchDegrees: h.pitch,
                      camera: _camera,
                      size: size,
                    );
                    if (offset == null) return const SizedBox.shrink();

                    return Positioned(
                      left: offset.dx - 24,
                      top: offset.dy - 24,
                      child: _HotspotButton(
                        hotspot: h,
                        onTap: () => widget.onHotspotTapped(h),
                      ),
                    );
                  },
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _HotspotButton extends StatelessWidget {
  const _HotspotButton({
    required this.hotspot,
    required this.onTap,
  });

  final TourHotspot hotspot;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Tokens.ink.withOpacity(0.8),
          shape: BoxShape.circle,
          border: Border.all(color: Tokens.surface, width: 2),
          boxShadow: Tokens.shadowMd,
        ),
        child: Icon(
          hotspot.kind == HotspotKind.navigation
              ? Icons.navigation
              : Icons.info_outline,
          color: Tokens.surface,
          size: 20,
        ),
      ),
    );
  }
}
