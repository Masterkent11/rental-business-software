import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../features/account/presentation/screens/account.screen.dart';
import '../features/applications/presentation/screens/applications.screen.dart';
import '../features/applications/presentation/screens/apply.screen.dart';
import '../features/bookings/domain/entities/stay_receipt.entity.dart';
import '../features/bookings/presentation/screens/booking_checkout.screen.dart';
import '../features/bookings/presentation/screens/booking_dates.screen.dart';
import '../features/bookings/presentation/screens/booking_detail.screen.dart';
import '../features/bookings/presentation/screens/bookings.screen.dart';
import '../features/discovery/presentation/screens/discovery.screen.dart';
import '../features/inbox/presentation/screens/messages.screen.dart';
import '../features/inbox/presentation/screens/notifications.screen.dart';
import '../features/listings/domain/entities/listing.entity.dart';
import '../features/listings/domain/entities/listing_detail.entity.dart';
import '../features/listings/presentation/screens/listing_detail.screen.dart';
import '../features/saved/presentation/screens/saved.screen.dart';
import '../features/tours/presentation/screens/tour.screen.dart';
import '../shared/launch/splash.screen.dart';
import '../shared/shell/home_shell.dart';

GoRouter createRouter({String initialLocation = '/'}) {
  final rootNavigatorKey = GlobalKey<NavigatorState>();
  final exploreNavigatorKey = GlobalKey<NavigatorState>();
  final savedNavigatorKey = GlobalKey<NavigatorState>();
  final staysNavigatorKey = GlobalKey<NavigatorState>();
  final appsNavigatorKey = GlobalKey<NavigatorState>();
  final accountNavigatorKey = GlobalKey<NavigatorState>();

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: initialLocation,
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            HomeShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            navigatorKey: exploreNavigatorKey,
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const DiscoveryScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: savedNavigatorKey,
            routes: [
              GoRoute(
                path: '/saved',
                builder: (context, state) => const SavedScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: staysNavigatorKey,
            routes: [
              GoRoute(
                path: '/bookings',
                builder: (context, state) => const BookingsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: appsNavigatorKey,
            routes: [
              GoRoute(
                path: '/applications',
                builder: (context, state) => const ApplicationsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: accountNavigatorKey,
            routes: [
              GoRoute(
                path: '/account',
                builder: (context, state) => const AccountScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/listing/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          final card = state.extra is Listing ? state.extra as Listing : null;
          return ListingDetailScreen(listingId: id, initialCard: card);
        },
      ),
      GoRoute(
        path: '/apply',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final listing = state.extra as Listing;
          return ApplyScreen(listing: listing);
        },
      ),
      GoRoute(
        path: '/booking/dates',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final listing = state.extra as Listing;
          return BookingDatesScreen(listing: listing);
        },
      ),
      GoRoute(
        path: '/booking/checkout',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final args = state.extra as CheckoutArgs;
          return BookingCheckoutScreen(args: args);
        },
      ),
      GoRoute(
        path: '/bookings/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final stay = state.extra as StayReceipt;
          return BookingDetailScreen(stay: stay);
        },
      ),
      GoRoute(
        path: '/tour/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          Listing? listing;
          ListingDetail? detail;
          if (state.extra is ({Listing listing, ListingDetail? detail})) {
            final tuple = state.extra as ({Listing listing, ListingDetail? detail});
            listing = tuple.listing;
            detail = tuple.detail;
          }
          return TourScreen(listingId: id, listing: listing, detail: detail);
        },
      ),
      GoRoute(
        path: '/messages',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const MessagesScreen(),
      ),
      GoRoute(
        path: '/notifications',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const NotificationsScreen(),
      ),
    ],
  );
}

final appRouter = createRouter(initialLocation: '/');
