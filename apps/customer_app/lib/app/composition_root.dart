import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import '../core/networking/api.client.dart';
import '../core/networking/api.config.dart';
import '../core/networking/api.exception.dart';
import '../core/storage/in_memory_token_storage.adapter.dart';
import '../core/storage/token_storage.port.dart';

// Account
import '../features/account/application/use_cases/get_account_profile.use_case.dart';
import '../features/account/application/use_cases/send_mobile_otp.use_case.dart';
import '../features/account/application/use_cases/sign_in.use_case.dart';
import '../features/account/application/use_cases/sign_out.use_case.dart';
import '../features/account/application/use_cases/sign_up.use_case.dart';
import '../features/account/application/use_cases/verify_mobile_otp.use_case.dart';
import '../features/account/domain/entities/account_profile.entity.dart';
import '../features/account/infrastructure/repositories/account_repository.adapter.dart';
import '../features/account/infrastructure/repositories/supabase_auth_repository.adapter.dart';
import '../features/account/ports/repositories/account_repository.port.dart';
import '../features/account/ports/repositories/auth_repository.port.dart';

// Applications
import '../features/applications/application/use_cases/get_application_by_id.use_case.dart';
import '../features/applications/application/use_cases/get_my_applications.use_case.dart';
import '../features/applications/application/use_cases/reserve_application.use_case.dart';
import '../features/applications/application/use_cases/submit_application.use_case.dart';
import '../features/applications/application/use_cases/withdraw_application.use_case.dart';
import '../features/applications/domain/entities/rental_application.entity.dart';
import '../features/applications/infrastructure/repositories/application_repository.adapter.dart';
import '../features/applications/ports/repositories/application_repository.port.dart';

// Bookings
import '../features/bookings/application/use_cases/cancel_booking.use_case.dart';
import '../features/bookings/application/use_cases/confirm_sandbox_payment.use_case.dart';
import '../features/bookings/application/use_cases/get_availability_calendar.use_case.dart';
import '../features/bookings/application/use_cases/get_my_stays.use_case.dart';
import '../features/bookings/application/use_cases/place_booking_hold.use_case.dart';
import '../features/bookings/application/use_cases/start_booking_payment.use_case.dart';
import '../features/bookings/domain/entities/stay_receipt.entity.dart';
import '../features/bookings/infrastructure/repositories/availability_repository.adapter.dart';
import '../features/bookings/infrastructure/repositories/booking_repository.adapter.dart';
import '../features/bookings/ports/repositories/availability_repository.port.dart';
import '../features/bookings/ports/repositories/booking_repository.port.dart';

// Listings
import '../features/listings/application/use_cases/get_listing_detail.use_case.dart';
import '../features/listings/application/use_cases/get_listings_by_ids.use_case.dart';
import '../features/listings/application/use_cases/search_listings.use_case.dart';
import '../features/listings/domain/entities/listing.entity.dart';
import '../features/listings/domain/entities/listing_detail.entity.dart';
import '../features/listings/infrastructure/repositories/listing_repository.adapter.dart';
import '../features/listings/ports/repositories/listing_repository.port.dart';

// Saved
import '../features/saved/application/use_cases/get_saved_listing_ids.use_case.dart';
import '../features/saved/application/use_cases/save_listing.use_case.dart';
import '../features/saved/application/use_cases/unsave_listing.use_case.dart';
import '../features/saved/infrastructure/repositories/saved_repository.adapter.dart';
import '../features/saved/ports/repositories/saved_repository.port.dart';

// Tours
import '../features/tours/application/use_cases/get_tour_for_resource.use_case.dart';
import '../features/tours/domain/entities/tour.entity.dart';
import '../features/tours/infrastructure/repositories/tour_repository.adapter.dart';
import '../features/tours/ports/repositories/tour_repository.port.dart';

// Discovery
export '../features/discovery/domain/value_objects/featured_lens.value_object.dart';
export '../features/discovery/presentation/controllers/discovery.controller.dart'
    show
        DiscoveryFilters,
        FiltersController,
        SearchCriteriaController,
        featuredLensProvider,
        filtersProvider,
        resultsProvider,
        searchCriteriaProvider;

typedef ListingCardView = Listing;
typedef ListingDetailView = ListingDetail;

// --- Core Networking & Storage ---

final apiConfigProvider = Provider<ApiConfig>((ref) => const ApiConfig());

final httpClientProvider = Provider<http.Client>((ref) => http.Client());

final tokenStorageProvider = Provider<TokenStoragePort>((ref) => InMemoryTokenStorage());

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  try {
    final client = supabase.Supabase.instance.client;
    return SupabaseAuthRepositoryAdapter(client);
  } catch (_) {
    return const _UnavailableAuthGateway();
  }
});

class _UnavailableAuthGateway implements AuthRepository {
  const _UnavailableAuthGateway();

  @override
  String? get accessToken => null;

  @override
  Stream<void> get changes => const Stream<void>.empty();

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    throw const ApiException(
      'Auth service not initialized',
      statusCode: 503,
      body: {'message': 'Auth service not initialized'},
    );
  }

  @override
  Future<void> signUpWithPassword({
    required String email,
    required String password,
  }) async {
    throw const ApiException(
      'Auth service not initialized',
      statusCode: 503,
      body: {'message': 'Auth service not initialized'},
    );
  }

  @override
  Future<void> sendMobileOtp(String mobile) async {
    throw const ApiException(
      'Auth service not initialized',
      statusCode: 503,
      body: {'message': 'Auth service not initialized'},
    );
  }

  @override
  Future<void> verifyMobileOtp({
    required String mobile,
    required String code,
  }) async {
    throw const ApiException(
      'Auth service not initialized',
      statusCode: 503,
      body: {'message': 'Auth service not initialized'},
    );
  }

  @override
  Future<void> signOut() async {}
}

final apiClientProvider = Provider<ApiClient>((ref) {
  final config = ref.watch(apiConfigProvider);
  final httpClient = ref.watch(httpClientProvider);
  final auth = ref.watch(authRepositoryProvider);
  return ApiClient(
    config: config,
    httpClient: httpClient,
    tokenSource: () => auth.accessToken,
  );
});

// --- Auth State ---

final sessionProvider = StreamProvider<void>((ref) {
  return ref.watch(authRepositoryProvider).changes;
});

final isSignedInProvider = Provider<bool>((ref) {
  ref.watch(sessionProvider);
  return ref.watch(authRepositoryProvider).accessToken != null;
});

final accountProfileProvider = FutureProvider<AccountProfile?>((ref) async {
  ref.watch(sessionProvider);
  if (ref.watch(authRepositoryProvider).accessToken == null) return null;

  try {
    return await ref.watch(accountRepositoryProvider).getProfile();
  } on ApiException catch (error) {
    if (error.isUnauthorized) return null;
    rethrow;
  }
});

final accountProvider = accountProfileProvider;

// --- Repositories ---

final accountRepositoryProvider = Provider<AccountRepository>((ref) {
  return AccountRepositoryAdapter(ref.watch(apiClientProvider));
});

final applicationRepositoryProvider = Provider<ApplicationRepository>((ref) {
  return ApplicationRepositoryAdapter(ref.watch(apiClientProvider));
});

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  return BookingRepositoryAdapter(ref.watch(apiClientProvider));
});

final availabilityRepositoryProvider = Provider<AvailabilityRepository>((ref) {
  return AvailabilityRepositoryAdapter(ref.watch(apiClientProvider));
});

final listingRepositoryProvider = Provider<ListingRepository>((ref) {
  return ListingRepositoryAdapter(ref.watch(apiClientProvider));
});

final savedRepositoryProvider = Provider<SavedRepository>((ref) {
  return SavedRepositoryAdapter(ref.watch(apiClientProvider));
});

final tourRepositoryProvider = Provider<TourRepository>((ref) {
  return TourRepositoryAdapter(ref.watch(apiClientProvider));
});

// --- Use Cases ---

// Account
final signInUseCaseProvider = Provider<SignInUseCase>((ref) => SignInUseCase(ref.watch(authRepositoryProvider)));
final signUpUseCaseProvider = Provider<SignUpUseCase>((ref) => SignUpUseCase(ref.watch(authRepositoryProvider)));
final signOutUseCaseProvider = Provider<SignOutUseCase>((ref) => SignOutUseCase(ref.watch(authRepositoryProvider)));
final sendMobileOtpUseCaseProvider = Provider<SendMobileOtpUseCase>((ref) => SendMobileOtpUseCase(ref.watch(authRepositoryProvider)));
final verifyMobileOtpUseCaseProvider = Provider<VerifyMobileOtpUseCase>((ref) => VerifyMobileOtpUseCase(ref.watch(authRepositoryProvider)));
final getAccountProfileUseCaseProvider = Provider<GetAccountProfileUseCase>((ref) => GetAccountProfileUseCase(ref.watch(accountRepositoryProvider)));

// Applications
final getMyApplicationsUseCaseProvider = Provider<GetMyApplicationsUseCase>((ref) => GetMyApplicationsUseCase(ref.watch(applicationRepositoryProvider)));
final getApplicationByIdUseCaseProvider = Provider<GetApplicationByIdUseCase>((ref) => GetApplicationByIdUseCase(ref.watch(applicationRepositoryProvider)));
final submitApplicationUseCaseProvider = Provider<SubmitApplicationUseCase>((ref) => SubmitApplicationUseCase(ref.watch(applicationRepositoryProvider)));
final withdrawApplicationUseCaseProvider = Provider<WithdrawApplicationUseCase>((ref) => WithdrawApplicationUseCase(ref.watch(applicationRepositoryProvider)));
final reserveApplicationUseCaseProvider = Provider<ReserveApplicationUseCase>((ref) => ReserveApplicationUseCase(ref.watch(applicationRepositoryProvider)));

// Bookings
final placeBookingHoldUseCaseProvider = Provider<PlaceBookingHoldUseCase>((ref) => PlaceBookingHoldUseCase(ref.watch(bookingRepositoryProvider)));
final startBookingPaymentUseCaseProvider = Provider<StartBookingPaymentUseCase>((ref) => StartBookingPaymentUseCase(ref.watch(bookingRepositoryProvider)));
final confirmSandboxPaymentUseCaseProvider = Provider<ConfirmSandboxPaymentUseCase>((ref) => ConfirmSandboxPaymentUseCase(ref.watch(bookingRepositoryProvider)));
final getAvailabilityCalendarUseCaseProvider = Provider<GetAvailabilityCalendarUseCase>((ref) => GetAvailabilityCalendarUseCase(ref.watch(availabilityRepositoryProvider)));
final getMyStaysUseCaseProvider = Provider<GetMyStaysUseCase>((ref) => GetMyStaysUseCase(ref.watch(bookingRepositoryProvider)));
final cancelBookingUseCaseProvider = Provider<CancelBookingUseCase>((ref) => CancelBookingUseCase(ref.watch(bookingRepositoryProvider)));

// Listings
final searchListingsUseCaseProvider = Provider<SearchListingsUseCase>((ref) => SearchListingsUseCase(ref.watch(listingRepositoryProvider)));
final getListingDetailUseCaseProvider = Provider<GetListingDetailUseCase>((ref) => GetListingDetailUseCase(ref.watch(listingRepositoryProvider)));
final getListingsByIdsUseCaseProvider = Provider<GetListingsByIdsUseCase>((ref) => GetListingsByIdsUseCase(ref.watch(listingRepositoryProvider)));

// Saved
final getSavedListingIdsUseCaseProvider = Provider<GetSavedListingIdsUseCase>((ref) => GetSavedListingIdsUseCase(ref.watch(savedRepositoryProvider)));
final saveListingUseCaseProvider = Provider<SaveListingUseCase>((ref) => SaveListingUseCase(ref.watch(savedRepositoryProvider)));
final unsaveListingUseCaseProvider = Provider<UnsaveListingUseCase>((ref) => UnsaveListingUseCase(ref.watch(savedRepositoryProvider)));

// Tours
final getTourForResourceUseCaseProvider = Provider<GetTourForResourceUseCase>((ref) => GetTourForResourceUseCase(ref.watch(tourRepositoryProvider)));

// --- Feature Providers ---

final staysProvider = FutureProvider<List<StayReceipt>>((ref) async {
  ref.watch(sessionProvider);
  if (ref.watch(authRepositoryProvider).accessToken == null) return const [];

  try {
    return await ref.watch(bookingRepositoryProvider).mine();
  } on ApiException catch (error) {
    if (error.isUnauthorized) return const [];
    rethrow;
  }
});

final stayDetailProvider =
    FutureProvider.autoDispose.family<StayReceipt?, String>((ref, id) {
  return ref.watch(bookingRepositoryProvider).byId(id);
});

final myApplicationsProvider =
    FutureProvider<List<RentalApplication>>((ref) async {
  ref.watch(sessionProvider);
  if (ref.watch(authRepositoryProvider).accessToken == null) return const [];

  try {
    return await ref.watch(applicationRepositoryProvider).mine();
  } on ApiException catch (error) {
    if (error.isUnauthorized) return const [];
    rethrow;
  }
});

final applicationDetailProvider =
    FutureProvider.autoDispose.family<RentalApplication?, String>((ref, id) {
  return ref.watch(applicationRepositoryProvider).byId(id);
});

final savedIdsProvider =
    AsyncNotifierProvider<SavedIds, Set<String>>(SavedIds.new);

class SavedIds extends AsyncNotifier<Set<String>> {
  @override
  Future<Set<String>> build() async {
    ref.watch(sessionProvider);
    if (ref.watch(authRepositoryProvider).accessToken == null) return {};

    try {
      final ids = await ref.watch(savedRepositoryProvider).savedIds();
      return ids.toSet();
    } on ApiException catch (error) {
      if (error.isUnauthorized) return {};
      rethrow;
    }
  }

  Future<void> toggle(String id) async {
    if (ref.read(authRepositoryProvider).accessToken == null) return;

    final current = state.valueOrNull ?? <String>{};
    final adding = !current.contains(id);
    final optimistic = {...current};
    adding ? optimistic.add(id) : optimistic.remove(id);
    state = AsyncData(optimistic);

    try {
      final repo = ref.read(savedRepositoryProvider);
      final ids = adding ? await repo.save(id) : await repo.unsave(id);
      state = AsyncData(ids.toSet());
    } on ApiException {
      state = AsyncData(current);
      rethrow;
    }
  }

  bool contains(String id) => state.valueOrNull?.contains(id) ?? false;
}

final isSavedProvider = Provider.family<bool, String>(
  (ref, id) =>
      ref.watch(savedIdsProvider).valueOrNull?.contains(id) ?? false,
);

final savedListingsProvider = FutureProvider<List<ListingCardView>>((ref) async {
  final ids = ref.watch(savedIdsProvider).valueOrNull ?? const <String>{};
  if (ids.isEmpty) return const [];
  return ref.watch(listingRepositoryProvider).byIds(ids);
});

final allListingsProvider = FutureProvider<List<ListingCardView>>((ref) async {
  return ref.watch(listingRepositoryProvider).all();
});

final listingDetailProvider =
    FutureProvider.autoDispose.family<ListingDetailView?, String>((ref, id) {
  return ref.watch(listingRepositoryProvider).detail(id);
});

final tourProvider =
    FutureProvider.autoDispose.family<Tour?, String>((ref, resourceId) {
  return ref.watch(tourRepositoryProvider).tourForResource(resourceId);
});

final panoramaImageLoaderProvider =
    Provider<Future<ui.Image> Function(String url)>((ref) {
  final api = ref.watch(apiClientProvider);
  return (url) => api.getImage(url);
});
