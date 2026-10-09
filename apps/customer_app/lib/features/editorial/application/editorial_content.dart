import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../explore/domain/explore_query.dart';
import '../../explore/domain/listing_category.dart';
import '../domain/editorial_card.dart';

typedef EditorialSlot = ({EditorialPlacement placement, ListingCategory? category});

abstract final class EditorialContent {
  static List<EditorialCard> cardsFor(EditorialSlot slot) => switch (slot.placement) {
        EditorialPlacement.home => _home,
        EditorialPlacement.staySearch => _staySearch(slot.category),
      };

  static final List<EditorialCard> _home = [
    const EditorialCard(
      id: 'home-explore',
      title: 'Live closer to\nwhat matters',
      body: 'Rentals, stays and homes for sale',
      actionLabel: 'Explore Homes',
      image: ListingCategory.exploreImage,
      action: EditorialAction.exploreHomes,
    ),
    EditorialCard(
      id: 'home-agents',
      title: 'Buying a home?\nTalk to an agent',
      body: 'Message the agent on any property for sale.',
      actionLabel: 'Homes for sale',
      image: ListingCategory.house.image,
      action: EditorialAction.homesForSale,
    ),
    EditorialCard(
      id: 'home-tours',
      title: 'Look around\nbefore you visit',
      body: 'Walk through listings with 360° tours.',
      actionLabel: 'See 360° tours',
      image: ListingCategory.condo.image,
      action: EditorialAction.virtualTours,
    ),
    EditorialCard(
      id: 'home-support',
      title: 'Need help finding\nthe right place?',
      body: 'Tell our support team what you need.',
      actionLabel: 'Contact support',
      image: ListingCategory.apartment.image,
      action: EditorialAction.contactSupport,
    ),
  ];

  static List<EditorialCard> _staySearch(ListingCategory? category) {
    final modes = category?.rentModes ?? RentMode.values;
    final places = category?.plural.toLowerCase() ?? 'places';
    final image = category?.image ?? ListingCategory.exploreImage;
    return [
      if (modes.contains(RentMode.shortStay))
        EditorialCard(
          id: 'stay-short',
          eyebrow: 'Short stays',
          title: 'Weekend getaways',
          body: 'Find $places for a few nights away.',
          actionLabel: 'Plan a short stay',
          image: image,
          action: EditorialAction.shortStays,
        ),
      if (modes.contains(RentMode.monthly))
        EditorialCard(
          id: 'stay-monthly',
          eyebrow: 'Monthly living',
          title: 'Settle in for the month',
          body: 'Move in for a month or longer with clear monthly rates.',
          actionLabel: 'Search monthly',
          image: ListingCategory.room.image,
          action: EditorialAction.monthlyStays,
        ),
      EditorialCard(
        id: 'stay-tours',
        eyebrow: '360° tours',
        title: 'Look around before you book',
        body: 'Walk through $places with 360° tours where owners provide them.',
        actionLabel: 'See 360° tours',
        image: ListingCategory.condo.image,
        action: EditorialAction.virtualTours,
      ),
      const EditorialCard(
        id: 'stay-support',
        eyebrow: 'Need a hand?',
        title: 'Plan your next stay with us',
        body: 'Tell our support team what you need and we will get back to you.',
        actionLabel: 'Contact support',
        image: ListingCategory.exploreImage,
        action: EditorialAction.contactSupport,
      ),
    ];
  }
}

final editorialCardsProvider =
    Provider.family<List<EditorialCard>, EditorialSlot>((ref, slot) => EditorialContent.cardsFor(slot));
