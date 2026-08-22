import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/account_repository.dart';
import '../../data/auth_repository.dart';
import 'sign_in_sheet.dart';

import '../../app/router.dart';

import '../../design/tokens.dart';

/// Account.
///
/// Nothing here authenticates — identity and sessions are Step 3 decisions. The
/// screen exists because the third tab has to be real, and because one thing is
/// worth stating from the very first build: **renting a place here does not
/// create a second account.** Customer and tenant are capabilities on one
/// login, held at the same time, and a customer who signs a lease keeps
/// browsing exactly as they were.
///
/// Re-registration at that moment would be the single most damaging break in
/// the product, so the app says so before it can happen.
/// What the server says this person may do, in plain words.
///
/// Read from the API response, never worked out from a token: capabilities are
/// resolved server-side per request (ADR-0007), and a client that decided for
/// itself would drift from the only authority that counts.
String _capabilityLine(AccountView view) {
  final held = <String>[
    if (view.isTenant) 'Tenant',
    if (view.isOwner) 'Owner',
  ];
  // D-15: renting does not create a second account. Customer is always true,
  // and the others are added to it rather than replacing it.
  return held.isEmpty ? 'Customer' : 'Customer · ${held.join(" · ")}';
}

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final account = ref.watch(accountProvider);

    return Scaffold(
      body: ListView(
        physics: Tokens.scroll,
        padding: EdgeInsets.zero,
        children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                Tokens.gutter,
                Tokens.s16,
                Tokens.gutter,
                Tokens.s20,
              ),
              child: Text('Account', style: theme.textTheme.displaySmall),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
            child: Container(
              padding: const EdgeInsets.all(Tokens.s20),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(Tokens.rMd),
                border: Border.all(color: theme.colorScheme.outlineVariant),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withOpacity(0.07),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.person_outline,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: Tokens.s16),
                  Expanded(
                    child: account.when(
                      loading: () => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Checking…', style: theme.textTheme.titleMedium),
                        ],
                      ),
                      error: (_, __) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Could not reach your account',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Check your connection and pull to retry',
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                      data: (view) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            view?.displayName.isNotEmpty == true
                                ? view!.displayName
                                : 'Not signed in',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            view == null
                                ? 'Sign in to keep your saved places'
                                : _capabilityLine(view),
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (account.valueOrNull == null && !account.isLoading)
                    FilledButton(
                      // The theme makes filled buttons full-width for page
                      // CTAs, which cannot work inside a row. Overridden here
                      // rather than weakening the theme everything else relies
                      // on.
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 44),
                        padding: const EdgeInsets.symmetric(
                          horizontal: Tokens.s16,
                        ),
                      ),
                      onPressed: () => showSignInSheet(context),
                      child: const Text('Sign in'),
                    )
                  else if (account.valueOrNull != null)
                    TextButton(
                      onPressed: () async {
                        await ref.read(authRepositoryProvider).signOut();
                      },
                      child: const Text('Sign out'),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: Tokens.s32),
          const _Group(
            title: 'Renting',
            items: [
              (Icons.description_outlined, 'My applications'),
              (Icons.receipt_long_outlined, 'Payments and receipts'),
            ],
            // Long-term applications live here rather than under Bookings:
            // an application is a different lifecycle from a nightly stay, and
            // one word covering both would blur the two.
            routeFor: {'My applications': Routes.applications},
          ),
          const _Group(
            title: 'Preferences',
            items: [
              (Icons.notifications_outlined, 'Notifications'),
              (Icons.bookmark_border, 'Saved searches'),
            ],
          ),
          const _Group(
            title: 'Support',
            items: [
              (Icons.help_outline, 'Help'),
              (Icons.shield_outlined, 'Privacy'),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Tokens.gutter,
              Tokens.s16,
              Tokens.gutter,
              Tokens.s40,
            ),
            child: Text(
              'One account for everything. Renting a place here does not create '
              'a second login — you keep browsing as a customer while you are a '
              'tenant.',
              style: theme.textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

class _Group extends StatelessWidget {
  const _Group({
    required this.title,
    required this.items,
    this.routeFor = const {},
  });

  final String title;
  final List<(IconData, String)> items;
  final Map<String, String> routeFor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: Tokens.s32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Tokens.gutter,
              0,
              Tokens.gutter,
              Tokens.s8,
            ),
            child: Text(title.toUpperCase(), style: theme.textTheme.labelSmall),
          ),
          for (final (icon, label) in items)
            _Row(icon: icon, label: label, route: routeFor[label]),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.label, this.route});

  final IconData icon;
  final String label;
  final String? route;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        if (route != null) {
          context.push(route!);
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$label needs the API contracts from Step 5.')),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: Tokens.gutter,
          vertical: Tokens.s16,
        ),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: theme.colorScheme.outlineVariant),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: Tokens.s16),
            Expanded(child: Text(label, style: theme.textTheme.bodyLarge)),
            Icon(
              Icons.chevron_right,
              size: 20,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}
