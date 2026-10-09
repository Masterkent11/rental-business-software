import '../../../app/router.dart';
import '../../explore/domain/explore_query.dart';
import '../../explore/domain/listing_category.dart';
import '../domain/editorial_card.dart';

String editorialRoute(EditorialAction action, {ListingCategory? category}) => switch (action) {
      EditorialAction.exploreHomes => Routes.explore(),
      EditorialAction.homesForSale => Routes.buy(),
      EditorialAction.virtualTours => Routes.rent(category: category, filter: QuickFilter.virtualTour),
      EditorialAction.contactSupport => Routes.contactSupport(topic: 'OTHER'),
      EditorialAction.shortStays => Routes.stays(category: category, rentMode: RentMode.shortStay),
      EditorialAction.monthlyStays => Routes.stays(category: category, rentMode: RentMode.monthly),
    };
