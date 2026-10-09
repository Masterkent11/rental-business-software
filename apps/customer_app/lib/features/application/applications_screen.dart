import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../design/app_image.dart';
import '../../design/money.dart';
import '../../data/application_repository.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';

class ApplicationsScreen extends ConsumerWidget {
  const ApplicationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(applicationsProvider);
    final applications = async.valueOrNull ?? const <ApplicationView>[];

    final appBar = AppBar(
      title: const Text('My applications'),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new, size: 18),
        onPressed: () => Navigator.of(context).maybePop(),
      ),
    );

    if (async.hasError) {
      return Scaffold(
        appBar: appBar,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Tokens.gutter),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Could not load your applications',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: Tokens.s12),
                FilledButton(
                  onPressed: () => ref.invalidate(applicationsProvider),
                  child: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (async.isLoading) {
      return Scaffold(
        appBar: appBar,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (applications.isEmpty) {
      return Scaffold(
        appBar: appBar,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Tokens.gutter),
            child: Text(
              'Nothing yet. Applying to a place is free, and it reserves '
              'nothing until the owner says yes.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: appBar,
      body: ListView.separated(
        physics: Tokens.scroll,
        padding: const EdgeInsets.fromLTRB(
          Tokens.gutter,
          Tokens.s8,
          Tokens.gutter,
          Tokens.s40,
        ),
        itemCount: applications.length,
        separatorBuilder: (_, __) => const SizedBox(height: Tokens.s16),
        itemBuilder: (context, i) => _ApplicationCard(app: applications[i]),
      ),
    );
  }
}

class _ApplicationCard extends StatelessWidget {
  const _ApplicationCard({required this.app});

  final ApplicationView app;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final date = DateFormat('d MMM');

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(Tokens.rLg),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(Tokens.s12),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(Tokens.rSm),
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: AppImage(
                      url: app.photo,
                      fallbackIcon: Icons.apartment_outlined,
                      seed: app.id.length,
                    ),
                  ),
                ),
                const SizedBox(width: Tokens.s12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        app.listingTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${Money.perMonth(app.monthlyCentavos)} · '
                        'move-in ${date.format(app.moveIn)}',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Tokens.s16,
              0,
              Tokens.s16,
              Tokens.s16,
            ),
            child: _Progress(status: app.status),
          ),
          _Outcome(app: app),
        ],
      ),
    );
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.status});

  final ApplicationStatus status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final reached = switch (status) {
      ApplicationStatus.submitted => 0,
      ApplicationStatus.underReview => 1,
      _ => 2,
    };
    final bad = status == ApplicationStatus.rejected || status == ApplicationStatus.expired;
    final doneColor = bad ? Tokens.taken : Tokens.available;

    const labels = ['Submitted', 'Under review', 'Decided'];

    return Column(
      children: [
        Row(
          children: [
            for (var i = 0; i < 3; i++) ...[
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i <= reached ? doneColor : Colors.transparent,
                  border: Border.all(
                    color: i <= reached ? doneColor : theme.colorScheme.outlineVariant,
                    width: 1.5,
                  ),
                ),
                child: i <= reached ? const Icon(Icons.check, size: 10, color: Colors.white) : null,
              ),
              if (i < 2)
                Expanded(
                  child: Container(
                    height: 1.5,
                    color: i < reached ? doneColor : theme.colorScheme.outlineVariant,
                  ),
                ),
            ],
          ],
        ),
        const SizedBox(height: Tokens.s6),
        Row(
          children: [
            for (var i = 0; i < labels.length; i++)
              Expanded(
                child: Text(
                  labels[i],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: switch (i) {
                    0 => TextAlign.start,
                    1 => TextAlign.center,
                    _ => TextAlign.end,
                  },
                  style: theme.textTheme.labelSmall,
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _Outcome extends StatelessWidget {
  const _Outcome({required this.app});

  final ApplicationView app;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final date = DateFormat('d MMM, h:mm a');

    Color tint;
    Widget body;

    switch (app.status) {
      case ApplicationStatus.submitted:
      case ApplicationStatus.underReview:
        tint = theme.colorScheme.onSurfaceVariant;
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              app.status == ApplicationStatus.submitted ? 'Sent to the owner' : 'The owner is reviewing this',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: Tokens.s4),
            Text(
              'Applying does not reserve the place — other people can apply for '
              'it too. You will be notified the moment this changes.',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: Tokens.s8),
            Text(
              'Submitted ${date.format(app.submittedAt)} · '
              '${app.documents.length} documents attached',
              style: theme.textTheme.labelSmall,
            ),
          ],
        );

      case ApplicationStatus.approved:
        tint = Tokens.available;
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'You have been approved',
              style: theme.textTheme.titleMedium?.copyWith(
                color: Tokens.available,
              ),
            ),
            const SizedBox(height: Tokens.s4),
            Text(
              'The place is held for you until '
              '${date.format(app.holdExpiresAt!)}. Pay the advance and deposit '
              'before then and it becomes yours.',
              style: theme.textTheme.bodyMedium,
            ),
            if (app.moveInCostCentavos != null) ...[
              const SizedBox(height: Tokens.s12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'To move in',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  Text(
                    Money.peso(app.moveInCostCentavos!),
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: Tokens.accent,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: Tokens.s12),
            FilledButton(
              onPressed: () {
                HapticFeedback.mediumImpact();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Payment needs the API contracts from Step 5.',
                    ),
                  ),
                );
              },
              child: const Text('Pay and sign'),
            ),
          ],
        );

      case ApplicationStatus.withdrawn:
        tint = theme.colorScheme.onSurfaceVariant;
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('You withdrew this', style: theme.textTheme.titleMedium),
            const SizedBox(height: Tokens.s4),
            Text(
              app.holdExpiresAt != null
                  ? 'The place went back on the market, and any reservation fee '
                      'was forfeited.'
                  : 'The place went back on the market. You can apply again.',
              style: theme.textTheme.bodyMedium,
            ),
          ],
        );
        break;

      case ApplicationStatus.rejected:
      case ApplicationStatus.expired:
        tint = Tokens.taken;
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              app.status == ApplicationStatus.rejected ? 'Not this time' : 'The hold expired',
              style: theme.textTheme.titleMedium?.copyWith(color: Tokens.taken),
            ),
            if (app.reason != null) ...[
              const SizedBox(height: Tokens.s4),
              Text(app.reason!, style: theme.textTheme.bodyMedium),
            ],
            const SizedBox(height: Tokens.s8),
            Text(
              'Your documents are still on file — the next application does '
              'not start from scratch.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: Tokens.s12),
            OutlinedButton(
              onPressed: () => context.go(Routes.discover),
              child: const Text('Find somewhere else'),
            ),
          ],
        );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(Tokens.s16),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.06),
        border: Border(
          top: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: body,
    );
  }
}
