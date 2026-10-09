import 'package:flutter/material.dart';

import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';

typedef ListingAttribute = ({IconData icon, String label});

String _count(int value, String singular, String plural) => '$value ${value == 1 ? singular : plural}';

List<ListingAttribute> listingSpecs(ListingCardView card) {
  final area = card.sqm ?? card.lotAreaSqm;
  return [
    if (card.beds > 0) (icon: Icons.bed_outlined, label: _count(card.beds, 'Bed', 'Beds')),
    if (card.baths > 0) (icon: Icons.bathtub_outlined, label: _count(card.baths, 'Bath', 'Baths')),
    if (area != null && area > 0) (icon: Icons.aspect_ratio, label: '$area sqm'),
  ];
}

List<ListingAttribute> listingAttributes(ListingCardView card) => [
      if (!card.isSale && card.maxGuests > 0)
        (icon: Icons.people_outline, label: _count(card.maxGuests, 'Guest', 'Guests')),
      ...listingSpecs(card),
      if (card.isSale && card.parkingSlots > 0)
        (icon: Icons.directions_car_outlined, label: _count(card.parkingSlots, 'Parking', 'Parking')),
    ];

List<ListingAttribute> listingHighlights(ListingCardView card) {
  final furnishing = card.furnishingLabel;
  return [
    if (furnishing != null) (icon: Icons.chair_outlined, label: furnishing),
    if (card.petsAllowed == true) (icon: Icons.pets_outlined, label: 'Pet-friendly'),
    if (card.petsAllowed == false) (icon: Icons.do_not_disturb_alt_outlined, label: 'No pets'),
  ];
}

class ListingAttributeStrip extends StatelessWidget {
  const ListingAttributeStrip({required this.card, super.key});

  final ListingCardView card;

  @override
  Widget build(BuildContext context) {
    final attributes = listingAttributes(card);
    final highlights = listingHighlights(card);
    if (attributes.isEmpty && highlights.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (attributes.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: Tokens.s12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Tokens.rSm),
              border: Border.all(color: Tokens.hairline),
            ),
            child: Row(
              children: [
                for (var i = 0; i < attributes.length; i++) ...[
                  if (i > 0) Container(width: 1, height: 32, color: Tokens.hairline),
                  Expanded(child: _AttributeColumn(attribute: attributes[i])),
                ],
              ],
            ),
          ),
        if (highlights.isNotEmpty) ...[
          if (attributes.isNotEmpty) const SizedBox(height: Tokens.s12),
          Wrap(
            spacing: Tokens.s8,
            runSpacing: Tokens.s8,
            children: [for (final highlight in highlights) _HighlightPill(attribute: highlight)],
          ),
        ],
      ],
    );
  }
}

class _AttributeColumn extends StatelessWidget {
  const _AttributeColumn({required this.attribute});

  final ListingAttribute attribute;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: attribute.label,
      excludeSemantics: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(attribute.icon, size: Tokens.controlIcon, color: Tokens.primaryNavy),
          const SizedBox(height: Tokens.s4),
          Text(
            attribute.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Tokens.primaryNavy),
          ),
        ],
      ),
    );
  }
}

class _HighlightPill extends StatelessWidget {
  const _HighlightPill({required this.attribute});

  final ListingAttribute attribute;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: Tokens.chipHeight,
      padding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
      decoration: BoxDecoration(
        color: Tokens.softBlue,
        borderRadius: BorderRadius.circular(Tokens.chipHeight / 2),
        border: Border.all(color: Tokens.hairline),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(attribute.icon, size: 16, color: Tokens.primaryNavy),
          const SizedBox(width: Tokens.s4 + 2),
          Text(
            attribute.label,
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Tokens.primaryNavy),
          ),
        ],
      ),
    );
  }
}
