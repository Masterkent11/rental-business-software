import '../../design/money.dart';
import '../../fixtures/view_models.dart';

String listingPriceLabel(ListingCardView listing) {
  final price = listing.priceCentavos;
  if (listing.isSale || price == null) return kPriceOnInquiry;
  return listing.kind == ListingKind.longTerm ? Money.perMonth(price) : Money.perNight(price);
}

String listingPriceShort(ListingCardView listing) {
  final price = listing.priceCentavos;
  if (listing.isSale || price == null) return 'Price on inquiry';
  return Money.peso(price);
}
