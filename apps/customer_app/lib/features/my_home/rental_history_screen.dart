import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/tenant_home_repository.dart';
import '../../design/components.dart';
import 'home_actions.dart';
import 'widgets/home_cards.dart';

class RentalHistoryScreen extends ConsumerWidget {
  const RentalHistoryScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
      appBar: AppBar(title: const Text('Rental history')),
      body: ref.watch(customerExperienceProvider).when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => ErrorState(
                message: 'Could not load rental history.', onRetry: () => ref.invalidate(customerExperienceProvider)),
            data: (experience) => experience.history.isEmpty
                ? const Center(child: Text('No past long-term rentals.'))
                : ListView(padding: const EdgeInsets.all(16), children: [
                    for (final home in experience.history)
                      Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: HomeCard(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(home.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            Text(home.unit),
                            Text(home.leaseDates),
                            const SizedBox(height: 12),
                            OutlinedButton(
                                onPressed: () => showInvoices(context, home), child: const Text('View invoices'))
                          ]))),
                  ]),
          ));
}
