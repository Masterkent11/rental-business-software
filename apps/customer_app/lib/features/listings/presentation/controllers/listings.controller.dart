import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/composition_root.dart';
import '../../domain/entities/listing_detail.entity.dart';

final listingDetailProvider = FutureProvider.family<ListingDetail?, String>((ref, id) async {
  final useCase = ref.watch(getListingDetailUseCaseProvider);
  return useCase.call(id);
});
