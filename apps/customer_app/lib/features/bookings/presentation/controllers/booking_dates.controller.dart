import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/composition_root.dart';
import '../../domain/entities/night_availability.entity.dart';
import '../../domain/entities/stay_receipt.entity.dart';

final availabilityCalendarProvider = FutureProvider.family<List<NightAvailability>, ({String resourceId, DateTime from, DateTime to})>((ref, args) async {
  final useCase = ref.watch(getAvailabilityCalendarUseCaseProvider);
  return useCase.call(
    resourceId: args.resourceId,
    from: args.from,
    to: args.to,
  );
});

final myStaysProvider = FutureProvider<List<StayReceipt>>((ref) async {
  final isSignedIn = ref.watch(isSignedInProvider);
  if (!isSignedIn) return [];

  final useCase = ref.watch(getMyStaysUseCaseProvider);
  return useCase.call();
});
