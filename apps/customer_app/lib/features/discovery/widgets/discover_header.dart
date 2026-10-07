import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../design/tokens.dart';

class DiscoverHeader extends StatelessWidget {
  const DiscoverHeader({
    super.key,
    this.location = 'Cebu City',
    this.hasUnreadNotifications = true,
  });

  final String location;
  final bool hasUnreadNotifications;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => HapticFeedback.selectionClick(),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.location_on_outlined,
                    size: 19,
                    color: Tokens.primaryNavy,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    location,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: Tokens.primaryNavy,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 18,
                    color: Tokens.primaryNavy,
                  ),
                ],
              ),
            ),
            Semantics(
              button: true,
              label: 'Notifications',
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  HapticFeedback.selectionClick();
                  context.push(Routes.notifications);
                },
                child: SizedBox(
                  width: 32,
                  height: 32,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      const Icon(
                        Icons.notifications_none_rounded,
                        size: 23,
                        color: Tokens.primaryNavy,
                      ),
                      if (hasUnreadNotifications)
                        Positioned(
                          top: 4,
                          right: 4,
                          child: Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: Color(0xFFEF4444),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        const Text(
          'Find your next place',
          style: TextStyle(
            fontSize: 27,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.7,
            color: Tokens.primaryNavy,
            height: 1.15,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Rent with confidence, live the way you want.',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            color: Tokens.muted,
            height: 1.3,
          ),
        ),
      ],
    );
  }
}
