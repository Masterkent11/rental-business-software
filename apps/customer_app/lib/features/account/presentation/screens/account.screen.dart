import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/composition_root.dart';
import '../../../../core/design/tokens.dart';
import '../sheets/sign_in.sheet.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isSignedIn = ref.watch(isSignedInProvider);
    final profileAsync = ref.watch(accountProfileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(Tokens.gutter),
        children: [
          if (!isSignedIn) ...[
            Container(
              padding: const EdgeInsets.all(Tokens.s24),
              decoration: BoxDecoration(
                color: Tokens.surfaceMuted,
                borderRadius: Tokens.borderLg,
                border: Border.all(color: Tokens.line),
              ),
              child: Column(
                children: [
                  const Icon(Icons.account_circle_outlined, size: 64, color: Tokens.inkMuted),
                  const SizedBox(height: Tokens.s16),
                  Text('Sign in to your account', style: theme.textTheme.titleMedium),
                  const SizedBox(height: Tokens.s8),
                  Text(
                    'Track applications, manage your stays, and save places you love.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(color: Tokens.inkMuted),
                  ),
                  const SizedBox(height: Tokens.s20),
                  FilledButton(
                    onPressed: () => showSignInSheet(context),
                    child: const Text('Sign in / Sign up'),
                  ),
                ],
              ),
            ),
          ] else ...[
            profileAsync.when(
              data: (profile) => _ProfileCard(
                name: profile?.displayName ?? 'Customer',
                email: profile?.primaryEmail,
                phone: profile?.primaryPhone,
                isTenant: profile?.isTenant ?? false,
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const _ProfileCard(
                name: 'Customer',
                email: null,
                phone: null,
                isTenant: false,
              ),
            ),
            const SizedBox(height: Tokens.s24),
            ListTile(
              leading: const Icon(Icons.logout, color: Tokens.danger),
              title: const Text('Sign out', style: TextStyle(color: Tokens.danger)),
              onTap: () async {
                await ref.read(signOutUseCaseProvider).call();
              },
            ),
          ],
          const SizedBox(height: Tokens.s32),
          const Divider(),
          const SizedBox(height: Tokens.s16),
          Text('About', style: theme.textTheme.titleSmall?.copyWith(color: Tokens.inkMuted)),
          const SizedBox(height: Tokens.s8),
          const ListTile(
            title: Text('Customer App'),
            subtitle: Text('Version 1.0.0 (Clean Architecture)'),
            contentPadding: EdgeInsets.zero,
          ),
        ],
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.name,
    required this.isTenant,
    this.email,
    this.phone,
  });

  final String name;
  final String? email;
  final String? phone;
  final bool isTenant;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(Tokens.s20),
      decoration: BoxDecoration(
        color: Tokens.surface,
        borderRadius: Tokens.borderLg,
        border: Border.all(color: Tokens.line),
        boxShadow: Tokens.shadowSm,
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: Tokens.ink,
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'U',
              style: const TextStyle(color: Tokens.surface, fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: Tokens.s16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                if (email != null) Text(email!, style: theme.textTheme.bodySmall),
                if (phone != null) Text(phone!, style: theme.textTheme.bodySmall),
                if (isTenant) ...[
                  const SizedBox(height: Tokens.s6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: const BoxDecoration(
                      color: Tokens.accentSoft,
                      borderRadius: Tokens.borderXs,
                    ),
                    child: const Text(
                      'ACTIVE TENANT',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Tokens.accent,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
