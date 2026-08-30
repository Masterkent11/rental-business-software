import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../features/account/account_screen.dart';
import '../features/application/applications_screen.dart';
import '../features/application/apply_screen.dart';
import '../features/booking/booking_checkout_screen.dart';
import '../features/booking/booking_dates_screen.dart';
import '../features/bookings/booking_detail_screen.dart';
import '../features/bookings/bookings_screen.dart';
import '../features/inbox/messages_screen.dart';
import '../features/inbox/notifications_screen.dart';
import '../features/discovery/discovery_screen.dart';
import '../features/listing/listing_detail_screen.dart';
import '../features/saved/saved_screen.dart';
import '../features/shell/home_shell.dart';
import '../features/tour/tour_screen.dart';

/// Route paths, in one place. Screens never write a path literal.
abstract final class Routes {
  static const discover = '/discover';
  static const saved = '/saved';
  static const bookings = '/bookings';
  static const account = '/account';
  static const notifications = '/notifications';
  static const applications = '/applications';
  static const messages = '/messages';

  static String listing(String id) => '$discover/listing/$id';
  static String tour(String id) => '${listing(id)}/tour';
  static String book(String id) => '${listing(id)}/book';
  static String apply(String id) => '${listing(id)}/apply';
  static String booking(String id) => '$bookings/$id';

  static String checkout({
    required String listingId,
    required String resourceId,
    required DateTime checkIn,
    required DateTime checkOut,
  }) =>
      '${book(listingId)}/checkout'
      '?resourceId=$resourceId&checkIn=${_isoDay(checkIn)}&checkOut=${_isoDay(checkOut)}';

  static String _isoDay(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';
}

/// The customer app's navigation.
///
/// A stateful shell with three branches, so scroll position and search state
/// survive tab switches — on a phone over mobile data, losing a search result
/// list because the user checked their saved listings is a real cost.
///
/// Listing detail and the tour are pushed **above** the shell deliberately: the
/// tour is immersive and must not share the screen with a navigation bar.
GoRouter buildRouter() {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: Routes.discover,
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            HomeShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.discover,
                builder: (context, state) => const DiscoveryScreen(),
                routes: [
                  GoRoute(
                    path: 'listing/:id',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => ListingDetailScreen(
                      listingId: state.pathParameters['id']!,
                    ),
                    routes: [
                      GoRoute(
                        path: 'tour',
                        parentNavigatorKey: _rootNavigatorKey,
                        builder: (context, state) => TourScreen(
                          listingId: state.pathParameters['id']!,
                        ),
                      ),
                      GoRoute(
                        path: 'book',
                        parentNavigatorKey: _rootNavigatorKey,
                        builder: (context, state) => BookingDatesScreen(
                          listingId: state.pathParameters['id']!,
                        ),
                        routes: [
                          GoRoute(
                            path: 'checkout',
                            parentNavigatorKey: _rootNavigatorKey,
                            builder: (context, state) {
                              final q = state.uri.queryParameters;
                              return BookingCheckoutScreen(
                                resourceId: q['resourceId']!,
                                checkIn: DateTime.parse(q['checkIn']!),
                                checkOut: DateTime.parse(q['checkOut']!),
                              );
                            },
                          ),
                        ],
                      ),
                      GoRoute(
                        path: 'apply',
                        parentNavigatorKey: _rootNavigatorKey,
                        builder: (context, state) => ApplyScreen(
                          listingId: state.pathParameters['id']!,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.saved,
                builder: (context, state) => const SavedScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.bookings,
                builder: (context, state) => const BookingsScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => BookingDetailScreen(
                      bookingId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.account,
                builder: (context, state) => const AccountScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: Routes.notifications,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: Routes.applications,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ApplicationsScreen(),
      ),
      GoRoute(
        path: Routes.messages,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const MessagesScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(title: const Text('Not found')),
      body: Center(child: Text('No screen for ${state.uri}')),
    ),
  );
}

final _rootNavigatorKey = GlobalKey<NavigatorState>();
