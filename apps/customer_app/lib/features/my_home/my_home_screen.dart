import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/account_repository.dart';
import '../../data/auth_repository.dart';
import '../../data/api_client.dart';
import '../../data/notification_repository.dart';
import '../../data/tenant_home_repository.dart';
import '../../design/components.dart';
import '../bookings/bookings_screen.dart';
import 'domain/tenant_home.dart';
import 'home_actions.dart';
import 'widgets/home_cards.dart';

class TenantLandingScreen extends ConsumerWidget {
  const TenantLandingScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => ref.watch(tenantHomesProvider).when(
        loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
        error: (error, stack) => Scaffold(
            body: SafeArea(
                child: ErrorState(
                    message: error is ApiException ? error.message : 'Could not load your home.',
                    onRetry: () => ref.invalidate(customerExperienceProvider)))),
        data: (homes) => homes.isEmpty ? const BookingsScreen() : MyHomeScreen(homes: homes),
      );
}

class MyHomeScreen extends ConsumerWidget {
  const MyHomeScreen({required this.homes, super.key});
  final List<TenantHome> homes;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(selectedTenancyProvider).valueOrNull;
    final home = homes.firstWhere((home) => home.id == selected, orElse: () => homes.first);
    final account = ref.watch(accountProvider).valueOrNull;
    final displayName = account?.id == ref.watch(currentUserIdProvider) ? account?.displayName : null;
    final unread = ref.watch(unreadNotificationsProvider);
    return Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
            bottom: false,
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(customerExperienceProvider);
                await ref.read(customerExperienceProvider.future);
              },
              child: ListView(padding: const EdgeInsets.fromLTRB(16, 22, 16, 100), children: [
                Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('YOUR SPACE',
                            style: TextStyle(fontSize: 12, letterSpacing: 1.3, color: Color(0xFF666970))),
                        SizedBox(height: 4),
                        Text('My Home',
                            style: TextStyle(fontSize: 29, fontWeight: FontWeight.w700, height: 1.15, color: homeNavy)),
                        SizedBox(height: 7),
                        Text('The essentials, at a glance.', style: TextStyle(fontSize: 14, color: homeMuted)),
                      ])),
                      Badge(
                          isLabelVisible: unread > 0,
                          smallSize: 7,
                          child: IconButton(
                              tooltip: 'Notifications',
                              onPressed: () => context.push(Routes.notifications),
                              style: IconButton.styleFrom(backgroundColor: const Color(0xFFF8F9FB)),
                              icon: const Icon(Icons.notifications_none_rounded, color: homeNavy))),
                      const SizedBox(width: 4),
                      Semantics(
                          button: true,
                          label: 'Open profile',
                          child: GestureDetector(
                              onTap: () => context.go(Routes.account),
                              child: CircleAvatar(
                                  radius: 20,
                                  backgroundColor: const Color(0xFFE8EDF4),
                                  child: Text(
                                      displayName?.isNotEmpty == true ? displayName!.substring(0, 1).toUpperCase() : '',
                                      style: const TextStyle(color: homeNavy))))),
                    ])),
                if (homes.length > 1)
                  Padding(
                      padding: const EdgeInsets.only(top: 16),
                      child: DropdownButtonFormField<String>(
                          key: ValueKey(home.id),
                          initialValue: home.id,
                          decoration: const InputDecoration(labelText: 'Your homes'),
                          items: homes
                              .map((home) => DropdownMenuItem(
                                  value: home.id,
                                  child: Text(home.title, maxLines: 1, overflow: TextOverflow.ellipsis)))
                              .toList(),
                          onChanged: (id) async {
                            if (id == null) return;
                            try {
                              await ref.read(selectedTenancyProvider.notifier).select(id);
                            } on ApiException catch (error) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
                              }
                            }
                          })),
                const SizedBox(height: 24),
                ActiveRentalHeroCard(home: home, onTap: () => context.push(Routes.tenancy(home.id))),
                const SizedBox(height: 14),
                UpcomingRentCard(home: home, onInvoice: () => showInvoices(context, home)),
                const SizedBox(height: 22),
                const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Manage your home',
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: homeNavy)),
                      SizedBox(height: 3),
                      Text('Everything you need in one place.', style: TextStyle(fontSize: 14, color: homeMuted)),
                    ])),
                const SizedBox(height: 14),
                for (final row in [
                  [
                    HomeActionCard(
                        title: 'Payments & Invoices',
                        description: 'View invoices, payment history and receipts',
                        icon: Icons.receipt_long_outlined,
                        onTap: () => showInvoices(context, home)),
                    HomeActionCard(
                        title: 'Message Owner',
                        description: 'Talk to your landlord directly',
                        icon: Icons.chat_outlined,
                        onTap: () => messageLandlord(context, home))
                  ],
                  [
                    HomeActionCard(
                        title: 'Maintenance',
                        description: 'Request repairs or report issues',
                        icon: Icons.build_outlined,
                        onTap: () => showModalBottomSheet<void>(
                            context: context,
                            isScrollControlled: true,
                            useSafeArea: true,
                            builder: (_) => MaintenanceRequest(home: home))),
                    HomeActionCard(
                        title: 'Lease Documents',
                        description: 'View your lease, contracts and important files',
                        icon: Icons.description_outlined,
                        onTap: () => showLeaseDocuments(context, home))
                  ],
                ])
                  Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: IntrinsicHeight(
                          child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        Expanded(child: row[0]),
                        const SizedBox(width: 12),
                        Expanded(child: row[1])
                      ]))),
                const SizedBox(height: 2),
                LeasePeriodSummary(home: home),
              ]),
            )));
  }
}
