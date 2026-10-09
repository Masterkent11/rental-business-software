import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/explore_query.dart';
import '../domain/listing_category.dart';

class ExploreController extends AutoDisposeFamilyNotifier<ExploreQuery, ExploreQuery> {
  @override
  ExploreQuery build(ExploreQuery seed) => seed;

  void replace(ExploreQuery next) {
    if (next.intent != state.intent) return;
    state = next;
  }

  void setCategory(ListingCategory? category) {
    if (category != null && !category.supports(state.intent)) return;
    state = state.copyWith(category: category, clearCategory: category == null);
  }

  void setText(String text) => state = state.copyWith(text: text.trim());

  void setArea(String? area) => state = state.copyWith(area: area, clearArea: area == null);

  void toggleQuickFilter(QuickFilter filter) {
    if (!filter.intents.contains(state.intent)) return;
    final next = {...state.quickFilters};
    if (!next.remove(filter)) next.add(filter);
    state = state.copyWith(quickFilters: next);
  }

  void setRentMode(RentMode? mode) {
    if (state.isBuy) return;
    state = state.copyWith(rentMode: mode, clearRentMode: mode == null, clearStay: true);
  }

  void applyStay(StaySearch stay) {
    if (state.isBuy) return;
    state = state.copyWith(
      stay: stay,
      rentMode: stay is ShortStaySearch ? RentMode.shortStay : RentMode.monthly,
    );
  }

  void clearStay() => state = state.copyWith(clearStay: true);

  void setBuyRefinement(BuyRefinement buy) {
    if (!state.isBuy) return;
    state = state.copyWith(buy: buy);
  }

  void setMaxPrice(int? centavos) {
    if (state.isBuy) return;
    state = state.copyWith(maxPriceCentavos: centavos, clearMaxPrice: centavos == null);
  }

  void setSort(ExploreSort sort) => state = state.copyWith(sort: sort);

  void clearFilters() => state = ExploreQuery(
        intent: state.intent,
        category: state.category,
        text: state.text,
        area: state.area,
        sort: state.sort,
      );
}

final exploreQueryProvider =
    NotifierProvider.autoDispose.family<ExploreController, ExploreQuery, ExploreQuery>(ExploreController.new);
