import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/tenant_home_repository.dart';
import '../../design/components.dart';
import 'home_actions.dart';
import 'widgets/home_cards.dart';

class UpcomingRentalsScreen extends ConsumerWidget {
  const UpcomingRentalsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
      appBar: AppBar(title: const Text('Upcoming rentals')),
      body: ref.watch(customerExperienceProvider).when(
          skipLoadingOnRefresh: false,
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) => ErrorState(
              message: error is ApiException ? error.message : 'Could not load your upcoming rentals.',
              onRetry: () => ref.invalidate(customerExperienceProvider)),
          data: (experience) => RefreshIndicator(
              onRefresh: () => ref.refresh(customerExperienceProvider.future),
              child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (experience.upcoming.isEmpty)
                      Text(experience.approvedApplications > 0
                          ? 'Review your approved applications and confirm the remaining move-in steps with your property manager.'
                          : 'No upcoming rentals have been confirmed.'),
                    for (final home in experience.upcoming)
                      Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: HomeCard(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(home.title,
                                style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w700, color: homeNavy)),
                            const SizedBox(height: 8),
                            Text(home.subtitle),
                            if (home.startsOn != null) ...[
                              const SizedBox(height: 12),
                              Text('Move-in: ${DateFormat('MMM d, yyyy').format(home.startsOn!)}'),
                            ],
                            const SizedBox(height: 8),
                            const Text('My Home will become available when your confirmed tenancy starts.'),
                            const SizedBox(height: 12),
                            Wrap(spacing: 8, runSpacing: 8, children: [
                              OutlinedButton(
                                  onPressed: () => messageLandlord(context, home),
                                  child: const Text('Message property manager')),
                              if (home.invoices.isNotEmpty)
                                OutlinedButton(
                                    onPressed: () => showInvoices(context, home), child: const Text('View invoices')),
                            ]),
                          ]))),
                    const SizedBox(height: 16),
                    OutlinedButton(
                        onPressed: () => context.push(Routes.applications), child: const Text('View applications')),
                  ]))));
}
