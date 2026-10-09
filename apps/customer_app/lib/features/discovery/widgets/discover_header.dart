import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../data/auth_repository.dart';
import '../../../data/notification_repository.dart';
import '../../../design/tokens.dart';
import '../../../design/typography.dart';
import '../../location/location_controller.dart';
import '../../location/location_sheet.dart';

class DiscoverHeader extends ConsumerWidget {
  const DiscoverHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locationState = ref.watch(locationProvider);
    final location = locationState.locating ? 'Locating…' : locationState.place.label;
    final signedIn = ref.watch(isSignedInProvider);
    final hasUnreadNotifications = signedIn && ref.watch(unreadNotificationsProvider) > 0;
    final city = locationState.cityContext;
    final supporting = city == null ? 'Homes, condos and more to rent or buy.' : 'Homes, condos and more in $city.';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: Semantics(
                button: true,
                label: 'Location: $location. Change location',
                excludeSemantics: true,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    showLocationSheet(context);
                  },
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: Tokens.tap),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          locationState.isNearMe ? Icons.near_me_outlined : Icons.location_on_outlined,
                          size: Tokens.controlIcon,
                          color: Tokens.primaryNavy,
                        ),
                        const SizedBox(width: Tokens.s4),
                        Flexible(
                          child: Text(
                            location,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppText.cardTitle.copyWith(fontSize: 15),
                          ),
                        ),
                        const Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: Tokens.primaryNavy),
                      ],
                    ),
                  ),
                ),
              ),
            ),
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
                  width: Tokens.tap,
                  height: Tokens.tap,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      const Icon(Icons.notifications_none_rounded, size: Tokens.navIcon, color: Tokens.primaryNavy),
                      if (hasUnreadNotifications)
                        Positioned(
                          top: 10,
                          right: 10,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(color: Tokens.taken, shape: BoxShape.circle),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: Tokens.s12),
        const Text('Find your\nnext place', style: AppText.hero),
        const SizedBox(height: Tokens.s6),
        Text(supporting, style: AppText.supporting),
      ],
    );
  }
}
