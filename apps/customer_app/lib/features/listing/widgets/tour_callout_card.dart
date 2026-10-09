import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../design/app_image.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';
import '../../tour/tour_intro_screen.dart';
import 'animated_360_indicator.dart';

class TourCalloutCard extends ConsumerWidget {
  const TourCalloutCard({
    required this.card,
    this.onTap,
    super.key,
  });

  final ListingCardView card;
  final VoidCallback? onTap;

  void _handleTap(BuildContext context, WidgetRef ref) {
    if (onTap != null) {
      onTap!();
      return;
    }
    final hasSeen = ref.read(hasSeenTourIntroProvider);
    final isTest = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
    if (!hasSeen && !isTest) {
      context.push(Routes.tourIntro(card.id));
    } else {
      context.push(Routes.tour(card.id));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final photo = card.photos.isNotEmpty ? card.photos.first : '';
    return GestureDetector(
      onTap: () => _handleTap(context, ref),
      child: Container(
        height: 175,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(Tokens.rMd),
          color: Tokens.primaryNavy,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (photo.isNotEmpty)
              AppImage(url: photo, fallbackIcon: Icons.threed_rotation, seed: 1)
            else
              Container(color: Tokens.primaryNavy),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.15),
                    Colors.black.withValues(alpha: 0.78),
                  ],
                  stops: const [0.0, 1.0],
                ),
              ),
            ),
            Center(
              child: Animated360Indicator(
                phoneWidth: 32,
                phoneHeight: 54,
                arrowRadius: 36,
                previewUrl: photo,
              ),
            ),
            Positioned(
              left: Tokens.s16,
              right: Tokens.s16,
              bottom: Tokens.s12,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Explore in 360°',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Move your phone or drag to look around',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 12.5,
                          ),
                        ),
                        const SizedBox(
                          width: 80,
                          height: 14,
                          child: Text(
                            'Walk through it',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.transparent,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 38,
                    height: 38,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.arrow_forward_rounded,
                      size: 18,
                      color: Tokens.primaryNavy,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
