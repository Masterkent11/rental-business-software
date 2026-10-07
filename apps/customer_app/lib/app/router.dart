import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../design/components.dart';
import '../features/account/account_screen.dart';
import '../features/application/applications_screen.dart';
import '../features/application/apply_screen.dart';
import '../features/auth/auth_screen.dart';
import '../features/booking/booking_checkout_screen.dart';
import '../features/booking/booking_dates_screen.dart';
import '../features/bookings/booking_detail_screen.dart';
import '../features/bookings/bookings_screen.dart';
import '../features/inbox/conversation_screen.dart';
import '../features/inbox/messages_screen.dart';
import '../features/inbox/notifications_screen.dart';
import '../features/inbox/start_conversation_screen.dart';
import '../features/discovery/discovery_screen.dart';
import '../features/listing/listing_detail_screen.dart';
import '../features/saved/saved_screen.dart';
import '../features/shell/home_shell.dart';
import '../features/tour/tour_screen.dart';
import '../features/property_search/domain/property_search_criteria.dart';
import '../features/property_search/domain/property_type.dart';
import '../features/property_search/presentation/property_results_screen.dart';
import '../features/property_search/presentation/property_search_screen.dart';

abstract final class Routes {
  static const discover = '/discover';
  static const saved = '/saved';
  static const bookings = '/bookings';
  static const account = '/account';
  static const notifications = '/notifications';
  static const applications = '/applications';
  static const messages = '/messages';
  static const propertyResults = '$discover/results';

  static String propertySearch(PropertyType type) => '$discover/search/${type.name}';
  static String listing(String id) => '$discover/listing/$id';
  static String tour(String id) => '${listing(id)}/tour';
  static String book(String id) => '${listing(id)}/book';
  static String apply(String id) => '${listing(id)}/apply';
  static String booking(String id, {bool confirmed = false}) =>
      '$bookings/$id${confirmed ? '?confirmed=1' : ''}';
  static String conversation(String id) => '$messages/$id';

  static String startConversation({required String listingId, String? bookingId}) =>
      Uri(
        path: '$messages/start',
        queryParameters: {'listing': listingId, if (bookingId != null) 'booking': bookingId},
      ).toString();

  static String auth({String? from, String? reason, String mode = 'signin'}) => Uri(
        path: '/auth',
        queryParameters: {
          'mode': mode,
          if (from != null) 'from': from,
          if (reason != null) 'reason': reason,
        },
      ).toString();

  static String checkout({
    required String listingId,
    required String resourceId,
    required DateTime checkIn,
    required DateTime checkOut,
    int guests = 1,
  }) =>
      '${book(listingId)}/checkout'
      '?resourceId=$resourceId&checkIn=${_isoDay(checkIn)}&checkOut=${_isoDay(checkOut)}&guests=$guests';

  static String _isoDay(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';
}

GoRouter buildRouter() {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: Routes.discover,
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => HomeShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.discover,
                builder: (context, state) => const DiscoveryScreen(),
                routes: [
                  GoRoute(
                    path: 'search/:propertyType',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) {
                      final type = PropertyType.tryParse(state.pathParameters['propertyType']) ??
                          PropertyType.apartment;
                      return PropertySearchScreen(propertyType: type);
                    },
                  ),
                  GoRoute(
                    path: 'results',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) {
                      final criteria = state.extra as PropertySearchCriteria?;
                      return PropertyResultsScreen(criteria: criteria);
                    },
                  ),
                  GoRoute(
                    path: 'listing/:id',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => ListingDetailScreen(
                      listingId: state.pathParameters['id']!,
                      saveOnOpen: state.uri.queryParameters['save'] == '1',
                    ),
                    routes: [
                      GoRoute(
                        path: 'tour',
                        parentNavigatorKey: _rootNavigatorKey,
                        builder: (context, state) => TourScreen(listingId: state.pathParameters['id']!),
                      ),
                      GoRoute(
                        path: 'book',
                        parentNavigatorKey: _rootNavigatorKey,
                        builder: (context, state) => BookingDatesScreen(listingId: state.pathParameters['id']!),
                        routes: [
                          GoRoute(
                            path: 'checkout',
                            parentNavigatorKey: _rootNavigatorKey,
                            builder: (context, state) {
                              final q = state.uri.queryParameters;
                              final checkIn = DateTime.tryParse(q['checkIn'] ?? '');
                              final checkOut = DateTime.tryParse(q['checkOut'] ?? '');
                              if (checkIn == null || checkOut == null) {
                                return BookingDatesScreen(listingId: state.pathParameters['id']!);
                              }
                              return BookingCheckoutScreen(
                                listingId: state.pathParameters['id']!,
                                resourceId: q['resourceId'] ?? '',
                                checkIn: checkIn,
                                checkOut: checkOut,
                                guests: int.tryParse(q['guests'] ?? '') ?? 1,
                              );
                            },
                          ),
                        ],
                      ),
                      GoRoute(
                        path: 'apply',
                        parentNavigatorKey: _rootNavigatorKey,
                        builder: (context, state) => ApplyScreen(listingId: state.pathParameters['id']!),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: Routes.saved, builder: (context, state) => const SavedScreen()),
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
                      justConfirmed: state.uri.queryParameters['confirmed'] == '1',
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.messages,
                builder: (context, state) => const MessagesScreen(),
                routes: [
                  GoRoute(
                    path: 'start',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => StartConversationScreen(
                      listingId: state.uri.queryParameters['listing'] ?? '',
                      bookingId: state.uri.queryParameters['booking'],
                    ),
                  ),
                  GoRoute(
                    path: ':id',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => ConversationScreen(conversationId: state.pathParameters['id']!),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: Routes.account, builder: (context, state) => const AccountScreen()),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/auth',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) {
          final q = state.uri.queryParameters;
          return MaterialPage(
            fullscreenDialog: true,
            child: AuthScreen(
              from: q['from'],
              reason: q['reason'],
              initialMode: switch (q['mode']) {
                'signup' => AuthMode.signUp,
                'reset' => AuthMode.reset,
                _ => AuthMode.signIn,
              },
            ),
          );
        },
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
    ],
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(),
      body: EmptyState(
        icon: Icons.explore_off_outlined,
        title: 'Page not found',
        message: 'That link doesn’t lead anywhere in the app.',
        actionLabel: 'Go home',
        onAction: () => context.go(Routes.discover),
      ),
    ),
  );
}

final _rootNavigatorKey = GlobalKey<NavigatorState>();
