import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/listing_repository.dart';
import '../../design/app_image.dart';
import '../../design/glass.dart';
import '../../design/tokens.dart';
import '../listing/widgets/animated_360_indicator.dart';

final hasSeenTourIntroProvider = StateProvider<bool>((ref) => false);

class TourIntroScreen extends ConsumerWidget {
  const TourIntroScreen({required this.listingId, super.key});

  final String listingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(listingDetailProvider(listingId));
    final photos = detailAsync.valueOrNull?.card.photos ?? const <String>[];
    final previewPhoto = photos.isNotEmpty ? photos.first : '';

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (previewPhoto.isNotEmpty)
            AppImage(
              url: previewPhoto,
              fit: BoxFit.cover,
              fallbackIcon: Icons.apartment_outlined,
              seed: 1,
            )
          else
            Container(color: const Color(0xFF17243D)),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.70),
                  Colors.black.withValues(alpha: 0.82),
                  Colors.black.withValues(alpha: 0.94),
                ],
                stops: const [0.0, 0.45, 1.0],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Glass.circle(
                      onTap: () => Navigator.of(context).maybePop(),
                      child: const Icon(
                        Icons.close,
                        size: 20,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Explore in 360°',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Move your phone left and right\nor drag to look around',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w400,
                      color: Colors.white.withValues(alpha: 0.85),
                      height: 1.35,
                    ),
                  ),
                  const Spacer(),
                  Animated360Indicator(
                    phoneWidth: 110,
                    phoneHeight: 185,
                    arrowRadius: 82,
                    isLarge: true,
                    previewUrl: previewPhoto,
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 18,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(Tokens.rMd),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.15),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _InstructionCol(
                          icon: Icons.touch_app_outlined,
                          title: 'Tap & Drag',
                          subtitle: 'Look around',
                        ),
                        _InstructionCol(
                          icon: Icons.screen_rotation_outlined,
                          title: 'Move Phone',
                          subtitle: 'Left and right',
                        ),
                        _InstructionCol(
                          icon: Icons.vrpano_outlined,
                          title: 'Immersive View',
                          subtitle: 'See every angle',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: () {
                      ref.read(hasSeenTourIntroProvider.notifier).state = true;
                      context.pushReplacement(Routes.tour(listingId));
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Tokens.primaryNavy,
                      minimumSize: const Size.fromHeight(54),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Tokens.rSm),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Start 360° Tour',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InstructionCol extends StatelessWidget {
  const _InstructionCol({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 28, color: Colors.white),
        const SizedBox(height: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w400,
            color: Colors.white.withValues(alpha: 0.75),
          ),
        ),
      ],
    );
  }
}
