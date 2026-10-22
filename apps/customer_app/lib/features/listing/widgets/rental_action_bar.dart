import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/api_client.dart';
import '../../../data/listing_repository.dart';
import '../../../design/money.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';
import '../listing_price.dart';

class RentalActionBar extends StatelessWidget {
  const RentalActionBar({
    required this.card,
    required this.isLongTerm,
    required this.onCommit,
    required this.onSelectDates,
    required this.onRetryQuote,
    this.quote,
    super.key,
  });

  final ListingCardView card;
  final bool isLongTerm;
  final AsyncValue<StayQuote>? quote;
  final VoidCallback onCommit;
  final VoidCallback onSelectDates;
  final VoidCallback onRetryQuote;

  @override
  Widget build(BuildContext context) {
    final priced = quote?.hasError == false ? quote?.valueOrNull : null;
    final loading = quote?.isLoading == true;
    final failed = quote?.hasError == true;
    final canReserve = quote == null || (!loading && priced?.available == true);
    final price = priced == null ? listingPriceLabel(card) : Money.peso(priced.totalCentavos);
    final caption = isLongTerm
        ? 'Long-term rental'
        : priced == null
            ? 'Select dates'
            : 'Total for ${priced.nights} ${priced.nights == 1 ? 'night' : 'nights'}';
    return Container(
      decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Tokens.hairline))),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter, vertical: Tokens.s12),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            if (failed)
              Row(children: [
                Expanded(
                    child: Text(quote!.error is ApiException
                        ? (quote!.error as ApiException).message
                        : 'Could not price these dates. Please retry.')),
                TextButton(onPressed: onRetryQuote, child: const Text('Retry')),
              ]),
            if (priced?.available == false) const Text('These dates are no longer available. Choose other dates.'),
            Row(children: [
              Expanded(
                  child: InkWell(
                onTap: isLongTerm ? null : onSelectDates,
                borderRadius: BorderRadius.circular(Tokens.rSm),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: Tokens.s8),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(loading ? 'Getting total…' : price,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Tokens.primaryNavy)),
                    Text(caption, style: const TextStyle(fontSize: 12, color: Tokens.muted)),
                  ]),
                ),
              )),
              const SizedBox(width: Tokens.s12),
              Flexible(
                  child: FilledButton(
                onPressed: card.hasListedPrice && card.isAvailable && (isLongTerm || canReserve) ? onCommit : null,
                style: FilledButton.styleFrom(
                    backgroundColor: Tokens.primaryNavy,
                    minimumSize: const Size(160, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Tokens.rSm))),
                child: Text(!card.hasListedPrice || !card.isAvailable
                    ? 'Not available'
                    : isLongTerm
                        ? 'Apply to rent'
                        : 'Reserve'),
              )),
            ]),
          ]),
        ),
      ),
    );
  }
}
