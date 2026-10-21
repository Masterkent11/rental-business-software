import 'package:flutter/material.dart';
import '../../design/money.dart';
import '../../design/tokens.dart';
import 'application_styles.dart';
import '../../fixtures/view_models.dart';

class ApplicationPropertySummary extends StatelessWidget {
  const ApplicationPropertySummary({required this.card, super.key});
  final ListingCardView card;
  @override
  Widget build(BuildContext context) => Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      color: Tokens.card,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Tokens.rCard), side: const BorderSide(color: ApplicationStyles.border)),
      child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(children: [
            if (card.photos.isNotEmpty)
              ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(card.photos.first,
                      width: 78,
                      height: 72,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stack) =>
                          const SizedBox(width: 78, height: 72, child: Icon(Icons.home_outlined)))),
            if (card.photos.isNotEmpty) const SizedBox(width: Tokens.s12),
            Expanded(child: LayoutBuilder(builder: (context, constraints) {
              final price =
                  Text(Money.perMonth(card.priceCentavos!), style: ApplicationStyles.label.copyWith(fontSize: 13));
              final title = Text(card.title, style: ApplicationStyles.label.copyWith(fontSize: 13));
              final wide = constraints.maxWidth >= 200 && MediaQuery.textScalerOf(context).scale(14) <= 18;
              return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                title,
                const SizedBox(height: Tokens.s4),
                Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Expanded(
                      child: Row(children: [
                    const Icon(Icons.location_on, size: 12, color: ApplicationStyles.muted),
                    const SizedBox(width: 3),
                    Expanded(
                        child: Text(card.place, maxLines: 2, style: ApplicationStyles.helper.copyWith(fontSize: 11))),
                  ])),
                  if (wide) ...[const SizedBox(width: Tokens.s4), price],
                ]),
                if (!wide) ...[const SizedBox(height: Tokens.s4), price],
              ]);
            })),
          ])));
}
