import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../design/components.dart';
import '../features/account/account_screen.dart';
import '../features/activity/activity_screen.dart';
import '../features/agents/agent_profile_screen.dart';
import '../features/inquiry/inquiry_screen.dart';
import '../features/viewing/request_viewing_screen.dart';
import '../features/application/applications_screen.dart';
import '../features/application/apply_screen.dart';
import '../features/auth/auth_screen.dart';
import '../features/booking/booking_checkout_screen.dart';
import '../features/booking/booking_dates_screen.dart';
import '../features/bookings/booking_detail_screen.dart';
import '../features/bookings/bookings_screen.dart';
import '../features/explore/domain/explore_mode.dart';
import '../features/explore/domain/explore_query.dart';
import '../features/explore/domain/explore_query_codec.dart';
import '../features/explore/domain/listing_category.dart';
import '../features/explore/presentation/buy_search_screen.dart';
import '../features/explore/presentation/explore_screen.dart';
import '../features/explore/presentation/rent_search_screen.dart';
import '../features/explore/presentation/stay_results_screen.dart';
import '../features/explore/presentation/stay_search_screen.dart';
import '../features/legal/contact_support_screen.dart';
import '../features/legal/content_page_screen.dart';
import '../features/legal/help_center_screen.dart';
import '../features/inbox/conversation_screen.dart';
import '../features/inbox/messages_screen.dart';
import '../features/inbox/notifications_screen.dart';
import '../features/inbox/start_conversation_screen.dart';
import '../features/discovery/discovery_screen.dart';
import '../features/listing/listing_detail_screen.dart';
import '../features/saved/saved_screen.dart';
import '../features/shell/home_shell.dart';
import '../features/tour/tour_screen.dart';
import '../features/tour/tour_intro_screen.dart';
import 'shell_destination.dart';

abstract final class Routes {
  static const discover = '/discover';
  static const explorePath = '$discover/explore';
  static const rentPath = '$discover/rent';
  static const buyPath = '$discover/buy';
  static const staysPath = '$discover/stays';
  static const saved = '/saved';
  static const bookings = '/bookings';
  static const account = '/account';
  static const notifications = '/notifications';
  static const applications = '/applications';
  static const messages = '/messages';
  static const help = '/help';
  static const support = '/support';

  static String explore({ExploreMode mode = ExploreMode.rent}) =>
      mode == ExploreMode.rent ? explorePath : Uri(path: explorePath, queryParameters: {'mode': mode.name}).toString();

  static String rent({
    ListingCategory? category,
    RentMode? rentMode,
    String? query,
    String? area,
    QuickFilter? filter,
    bool search = false,
  }) =>
      _location(
        rentPath,
        ExploreQuery(
          category: category,
          rentMode: rentMode,
          text: query ?? '',
          area: area,
          quickFilters: {if (filter != null) filter},
        ),
        search: search,
      );

  static String stays({ListingCategory? category, RentMode? rentMode}) =>
      _location(staysPath, ExploreQuery(category: category, rentMode: rentMode));

  static String stayResults(ExploreQuery query) => _location('$staysPath/results', query);

  static String buy({
    ListingCategory? category,
    String? query,
    String? area,
    QuickFilter? filter,
    bool search = false,
  }) =>
      _location(
        buyPath,
        ExploreQuery(
          intent: MarketIntent.buy,
          category: category,
          text: query ?? '',
          area: area,
          quickFilters: {if (filter != null) filter},
        ),
        search: search,
      );

  static String _location(String path, ExploreQuery query, {bool search = false}) {
    final parameters = {...ExploreQueryCodec.encode(query), if (search) 'search': '1'};
    return parameters.isEmpty ? path : Uri(path: path, queryParameters: parameters).toString();
  }

  static String legal(String slug) => '/legal/$slug';
  static String helpArticle(String slug) => '$help/$slug';
  static String contactSupport({String? topic, String? listingId}) => Uri(
        path: support,
        queryParameters: {
          if (topic != null) 'topic': topic,
          if (listingId != null) 'listing': listingId,
        },
      ).toString();
  static String listing(String id) => '$discover/listing/$id';
  static String tour(String id) => '${listing(id)}/tour';
  static String tourIntro(String id) => '${listing(id)}/tour-intro';
  static String book(String id) => '${listing(id)}/book';
  static String apply(String id) => '${listing(id)}/apply';
  static String inquire(String id) => '${listing(id)}/inquire';
  static String viewing(String id) => '${listing(id)}/viewing';
  static String viewingRequest(String listingId, String viewingId) => '${viewing(listingId)}?request=$viewingId';
  static String agent(String id) => '/agents/$id';
  static const activity = '/activity';
  static String booking(String id, {bool confirmed = false}) => '$bookings/$id${confirmed ? '?confirmed=1' : ''}';
  static String conversation(String id) => '$messages/$id';

  static String startConversation({required String listingId, String? bookingId}) => Uri(
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

  static String _isoDay(DateTime d) => '${d.year.toString().padLeft(4, '0')}-'
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
          for (final destination in ShellDestination.values) _branches[destination]!,
        ],
      ),
      GoRoute(path: '/explore', redirect: (context, state) => Routes.explorePath),
      GoRoute(
        path: '/legal/:slug',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => ContentPageScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        path: Routes.help,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const HelpCenterScreen(),
        routes: [
          GoRoute(
            path: ':slug',
            parentNavigatorKey: _rootNavigatorKey,
            builder: (context, state) => ContentPageScreen(slug: state.pathParameters['slug']!),
          ),
        ],
      ),
      GoRoute(
        path: Routes.support,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => ContactSupportScreen(
          initialTopic: state.uri.queryParameters['topic'],
          listingId: state.uri.queryParameters['listing'],
        ),
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
        path: '/agents/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => AgentProfileScreen(agentId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: Routes.activity,
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ActivityScreen(),
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

ExploreQuery _seedFrom(Uri uri, MarketIntent intent) => ExploreQueryCodec.decode(uri.queryParameters, intent);

final Map<ShellDestination, StatefulShellBranch> _branches = {
  ShellDestination.home: StatefulShellBranch(
    routes: [
      GoRoute(
        path: Routes.discover,
        builder: (context, state) => const DiscoveryScreen(),
        routes: [
          GoRoute(
            path: 'explore',
            redirect: (context, state) {
              final q = state.uri.queryParameters;
              if (!q.containsKey('intent') && !q.containsKey('category')) return null;
              final category = ListingCategory.tryParse(q['category']);
              final intent = MarketIntent.tryParse(q['intent']) ?? category?.defaultIntent ?? MarketIntent.rent;
              return intent == MarketIntent.buy
                  ? Routes.buy(category: category, query: q['q'])
                  : Routes.rent(category: category, query: q['q']);
            },
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: ExploreScreen(initialMode: ExploreMode.tryParse(state.uri.queryParameters['mode'])),
            ),
          ),
          GoRoute(
            path: 'rent',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: RentSearchScreen(
                key: ValueKey(state.uri.toString()),
                seed: _seedFrom(state.uri, MarketIntent.rent),
                focusSearch: state.uri.queryParameters['search'] == '1',
              ),
            ),
          ),
          GoRoute(
            path: 'stays',
            pageBuilder: (context, state) {
              final seed = _seedFrom(state.uri, MarketIntent.rent);
              return NoTransitionPage(
                key: state.pageKey,
                child: StaySearchScreen(
                  key: ValueKey(state.uri.toString()),
                  category: seed.category,
                  initialMode: seed.rentMode,
                ),
              );
            },
            routes: [
              GoRoute(
                path: 'results',
                builder: (context, state) => StayResultsScreen(
                  key: ValueKey(state.uri.toString()),
                  query: _seedFrom(state.uri, MarketIntent.rent),
                ),
              ),
            ],
          ),
          GoRoute(
            path: 'buy',
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: BuySearchScreen(
                key: ValueKey(state.uri.toString()),
                seed: _seedFrom(state.uri, MarketIntent.buy),
                focusSearch: state.uri.queryParameters['search'] == '1',
              ),
            ),
          ),
          GoRoute(
            path: 'search/:category',
            redirect: (context, state) {
              final category = ListingCategory.tryParse(state.pathParameters['category']);
              return category != null && !category.supports(MarketIntent.rent)
                  ? Routes.buy(category: category)
                  : Routes.rent(category: category);
            },
          ),
          GoRoute(path: 'results', redirect: (context, state) => Routes.rentPath),
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
                path: 'tour-intro',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => TourIntroScreen(listingId: state.pathParameters['id']!),
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
              GoRoute(
                path: 'inquire',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => InquiryScreen(listingId: state.pathParameters['id']!),
              ),
              GoRoute(
                path: 'viewing',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => RequestViewingScreen(
                  listingId: state.pathParameters['id']!,
                  rescheduleId: state.uri.queryParameters['reschedule'],
                  viewingId: state.uri.queryParameters['request'],
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  ),
  ShellDestination.saved: StatefulShellBranch(
    routes: [
      GoRoute(path: Routes.saved, builder: (context, state) => const SavedScreen()),
    ],
  ),
  ShellDestination.bookings: StatefulShellBranch(
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
  ShellDestination.messages: StatefulShellBranch(
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
  ShellDestination.profile: StatefulShellBranch(
    routes: [
      GoRoute(path: Routes.account, builder: (context, state) => const AccountScreen()),
    ],
  ),
};
