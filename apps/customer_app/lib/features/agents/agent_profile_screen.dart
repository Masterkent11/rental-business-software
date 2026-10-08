import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/marketplace_repository.dart';
import '../../design/tokens.dart';
import '../discovery/widgets/buy_listing_card.dart';
import '../discovery/widgets/listing_card.dart';

String? responseSummary(AgentProfileView agent) {
  final rate = agent.respondedWithinDayRate;
  if (rate == null) return null;
  final minutes = agent.medianResponseMinutes;
  final median = minutes == null
      ? null
      : minutes < 60
          ? '$minutes min'
          : '${(minutes / 60).toStringAsFixed(minutes < 600 ? 1 : 0)} h';
  return [
    'Replies to ${(rate * 100).round()}% of inquiries within a day',
    if (median != null) 'usually in $median',
  ].join(', ');
}

class AgentProfileScreen extends ConsumerWidget {
  const AgentProfileScreen({required this.agentId, super.key});

  final String agentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(agentProfileProvider(agentId));
    return Scaffold(
      backgroundColor: Tokens.canvas,
      appBar: AppBar(
        backgroundColor: Tokens.canvas,
        title: const Text('Agent'),
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new, size: 18), onPressed: () => Navigator.of(context).maybePop()),
      ),
      body: switch (async) {
        AsyncError(:final error) => _Message(
            text: error is ApiException ? error.message : 'We could not load this agent.',
            onRetry: () => ref.invalidate(agentProfileProvider(agentId)),
          ),
        AsyncData(value: null) => const _Message(text: 'This agent profile is not available.'),
        AsyncData(:final value) => _Profile(agent: value!),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _Profile extends StatelessWidget {
  const _Profile({required this.agent});

  final AgentProfileView agent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final initials = agent.displayName.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();
    final response = responseSummary(agent);
    return ListView(
      physics: Tokens.scroll,
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s40),
      children: [
        Center(
          child: CircleAvatar(
            radius: 46,
            backgroundColor: Tokens.softBlue,
            foregroundImage: agent.photoUrl == null ? null : NetworkImage(agent.photoUrl!),
            child: Text(initials, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
          ),
        ),
        const SizedBox(height: Tokens.s12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Flexible(child: Text(agent.displayName, textAlign: TextAlign.center, style: theme.textTheme.headlineSmall?.copyWith(color: Tokens.primaryNavy))),
            if (agent.verified) ...[
              const SizedBox(width: 6),
              const Icon(Icons.verified, color: Tokens.primaryBlue, size: 22, semanticLabel: 'Verified agent'),
            ],
          ],
        ),
        if (agent.headline.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(agent.headline, textAlign: TextAlign.center, style: const TextStyle(color: Tokens.muted)),
        ],
        const SizedBox(height: Tokens.s8),
        Text(
          [
            if (agent.verified) 'Verified${agent.licenseAuthority == null ? '' : ' by ${agent.licenseAuthority}'}' else 'Not yet verified',
            'Member since ${DateFormat('MMMM yyyy').format(agent.memberSince)}',
          ].join(' · '),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 12.5, color: Tokens.muted),
        ),
        const SizedBox(height: Tokens.s20),
        Row(
          children: [
            _Stat(value: '${agent.activeListings}', label: agent.activeListings == 1 ? 'Active listing' : 'Active listings'),
            const SizedBox(width: Tokens.s8),
            _Stat(value: agent.areasServed.isEmpty ? '—' : '${agent.areasServed.length}', label: 'Areas served'),
          ],
        ),
        if (response != null) ...[
          const SizedBox(height: Tokens.s12),
          Row(
            children: [
              const Icon(Icons.bolt_outlined, size: 18, color: Tokens.primaryNavy),
              const SizedBox(width: 6),
              Expanded(child: Text(response, style: const TextStyle(fontSize: 13, color: Tokens.primaryNavy))),
            ],
          ),
        ],
        if (agent.bio.isNotEmpty) ...[
          const SizedBox(height: Tokens.s24),
          Text('About', style: theme.textTheme.titleLarge),
          const SizedBox(height: Tokens.s8),
          Text(agent.bio, style: theme.textTheme.bodyLarge),
        ],
        for (final (title, values) in [
          ('Specialties', agent.specialties),
          ('Areas served', agent.areasServed),
          ('Languages', agent.languages),
        ])
          if (values.isNotEmpty) ...[
            const SizedBox(height: Tokens.s20),
            Text(title, style: theme.textTheme.titleMedium),
            const SizedBox(height: Tokens.s8),
            Wrap(
              spacing: Tokens.s8,
              runSpacing: Tokens.s8,
              children: [
                for (final value in values)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: Tokens.hairline),
                    ),
                    child: Text(value),
                  ),
              ],
            ),
          ],
        const SizedBox(height: Tokens.s24),
        Text('Listings', style: theme.textTheme.titleLarge),
        const SizedBox(height: Tokens.s12),
        if (agent.listings.isEmpty)
          const Text('No published listings right now.', style: TextStyle(color: Tokens.muted))
        else
          for (final listing in agent.listings)
            Padding(
              padding: const EdgeInsets.only(bottom: Tokens.s16),
              child: listing.isSale
                  ? BuyListingCard(listing: listing, onTap: () => context.push(Routes.listing(listing.id)))
                  : ListingCard(listing: listing, onTap: () => context.push(Routes.listing(listing.id))),
            ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(Tokens.s12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Tokens.rSm),
          border: Border.all(color: Tokens.hairline),
        ),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
            Text(label, style: const TextStyle(fontSize: 12, color: Tokens.muted)),
          ],
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.text, this.onRetry});

  final String text;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Tokens.s32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(text, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: Tokens.s16),
              FilledButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ],
        ),
      ),
    );
  }
}
