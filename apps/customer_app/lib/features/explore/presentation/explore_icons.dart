import 'package:flutter/material.dart';

import '../domain/explore_query.dart';
import '../domain/listing_category.dart';

extension ListingCategoryIcon on ListingCategory {
  IconData get icon => switch (this) {
        ListingCategory.apartment => Icons.apartment_outlined,
        ListingCategory.condo => Icons.domain_outlined,
        ListingCategory.house => Icons.house_outlined,
        ListingCategory.room => Icons.bed_outlined,
        ListingCategory.boardingHouse => Icons.groups_2_outlined,
        ListingCategory.townhouse => Icons.holiday_village_outlined,
        ListingCategory.lot => Icons.landscape_outlined,
        ListingCategory.commercial => Icons.storefront_outlined,
      };
}

extension QuickFilterIcon on QuickFilter {
  IconData get icon => switch (this) {
        QuickFilter.furnished => Icons.chair_outlined,
        QuickFilter.petFriendly => Icons.pets_outlined,
        QuickFilter.virtualTour => Icons.threed_rotation,
        QuickFilter.pool => Icons.pool_outlined,
        QuickFilter.preSelling => Icons.construction_outlined,
      };
}
