import '../explore/domain/listing_category.dart';

enum HomeShortcut {
  apartment('Apartment', 'apartment', category: ListingCategory.apartment),
  condo('Condo', 'condo', category: ListingCategory.condo),
  house('House', 'house', category: ListingCategory.house),
  room('Room', 'room', category: ListingCategory.room),
  boardingHouse('Boarding House', 'boarding_house', category: ListingCategory.boardingHouse),
  buy('Buy', 'buy', intent: MarketIntent.buy);

  const HomeShortcut(this.label, this._asset, {this.category, this.intent = MarketIntent.rent});

  final String label;
  final String _asset;
  final ListingCategory? category;
  final MarketIntent intent;

  String get icon => 'assets/icons/categories/$_asset.svg';
}
