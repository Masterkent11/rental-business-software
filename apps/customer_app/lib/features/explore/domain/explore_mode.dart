import 'explore_query.dart';
import 'listing_category.dart';

enum ExploreMode {
  rent('Rent', MarketIntent.rent, null),
  buy('Buy', MarketIntent.buy, null),
  shortStay('Short Stay', MarketIntent.rent, RentMode.shortStay),
  monthly('Monthly', MarketIntent.rent, RentMode.monthly);

  const ExploreMode(this.label, this.intent, this.rentMode);

  final String label;
  final MarketIntent intent;
  final RentMode? rentMode;

  List<ListingCategory> get categories {
    final mode = rentMode;
    final all = ListingCategory.forIntent(intent);
    return mode == null ? all : all.where((category) => category.rentModes.contains(mode)).toList(growable: false);
  }

  static ExploreMode tryParse(String? value) =>
      values.firstWhere((mode) => mode.name == value, orElse: () => ExploreMode.rent);
}
