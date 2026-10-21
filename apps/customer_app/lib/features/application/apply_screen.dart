import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/listing_repository.dart';
import '../../data/api_client.dart';
import '../../fixtures/view_models.dart';
import 'application_flow_view.dart';

class ApplyScreen extends ConsumerWidget {
  const ApplyScreen({required this.listingId, super.key});
  final String listingId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(listingDetailProvider(listingId));
    return detail.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, stack) => Scaffold(
          appBar: AppBar(title: const Text('Apply to rent')),
          body: Center(
              child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text(error is ApiException ? error.message : 'Could not load this place.',
                        textAlign: TextAlign.center),
                    TextButton(
                        onPressed: () => ref.invalidate(listingDetailProvider(listingId)),
                        child: const Text('Try again')),
                  ])))),
      data: (value) {
        final card = value?.card;
        if (card == null ||
            card.kind != ListingKind.longTerm ||
            card.isSale ||
            card.priceCentavos == null ||
            card.resourceId.isEmpty) {
          return Scaffold(
              appBar: AppBar(title: const Text('Apply to rent')),
              body: const Center(child: Text('This place is not accepting rental applications.')));
        }
        return ApplicationFlowView(key: ValueKey(card.resourceId), card: card, requirements: value!.terms);
      },
    );
  }
}
