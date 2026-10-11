import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../data/auth_repository.dart';
import '../../../data/notification_repository.dart';
import '../../../design/home_assets.dart';
import '../../../design/tokens.dart';

class DiscoverHeader extends ConsumerWidget {
  const DiscoverHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(isSignedInProvider);
    final hasUnreadNotifications = signedIn && ref.watch(unreadNotificationsProvider) > 0;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Semantics(
            button: true,
            label: 'Search places',
            excludeSemantics: true,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                HapticFeedback.selectionClick();
                context.push(Routes.rent(search: true));
              },
              child: Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(13),
                  border: Border.all(
                    color: const Color(0xFFE2E6EC),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Image.asset(
                      HomeAssets.searchPng,
                      width: 17,
                      height: 17,
                      color: const Color(0xFF7A8493),
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Search places',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                          color: Color(0xFF7A8493),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        IgnorePointer(
          child: Container(
            height: 44,
            width: 114,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF142642), Color(0xFF3568A0)],
              ),
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Center(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image(
                      image: AssetImage(HomeAssets.askBinoWhitePng),
                      width: 16,
                      height: 16,
                    ),
                    SizedBox(width: 6),
                    Text(
                      'Ask Bino',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Semantics(
          button: true,
          label: hasUnreadNotifications ? 'Notifications, unread' : 'Notifications',
          excludeSemantics: true,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              HapticFeedback.selectionClick();
              context.push(Routes.notifications);
            },
            child: SizedBox(
              width: 44,
              height: 44,
              child: Center(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Image.asset(
                      HomeAssets.bellPng,
                      width: 22,
                      height: 22,
                      color: const Color(0xFF142642),
                    ),
                    if (hasUnreadNotifications)
                      Positioned(
                        top: 2,
                        right: 2,
                        child: Container(
                          width: 7,
                          height: 7,
                          decoration: const BoxDecoration(
                            color: Tokens.taken,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
