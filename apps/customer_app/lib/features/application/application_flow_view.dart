import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../data/application_repository.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';
import 'application_controller.dart';
import 'application_details_view.dart';
import 'application_property_summary.dart';
import 'verification_panel.dart';
import 'domain/verification.dart';
import 'application_styles.dart';
import '../legal/policy_agreement_note.dart';
import '../listing/widgets/move_in_cost_card.dart';

class ApplicationFlowView extends ConsumerStatefulWidget {
  const ApplicationFlowView({required this.card, this.requirements = const [], super.key});
  final ListingCardView card;
  final List<String> requirements;
  @override
  ConsumerState<ApplicationFlowView> createState() => _ApplicationFlowViewState();
}

class _ApplicationFlowViewState extends ConsumerState<ApplicationFlowView> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(applicationFlowProvider(widget.card.resourceId).notifier).configureListing(widget.card);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    ref
        .read(applicationFlowProvider(widget.card.resourceId).notifier)
        .setForeground(state == AppLifecycleState.resumed);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = applicationFlowProvider(widget.card.resourceId);
    final flow = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    ref.listen(provider, (previous, next) {
      if (previous?.applicationId != next.applicationId && next.applicationId != null) {
        ref.invalidate(applicationsProvider);
      }
    });
    final stage = flow.session?.status;
    if (flow.step == ApplicationStep.verification &&
        stage != null &&
        ![
          VerificationStatus.consentRequired,
          VerificationStatus.detailsConfirmed,
          VerificationStatus.failed,
          VerificationStatus.expired,
          VerificationStatus.cancelled,
          VerificationStatus.manualReview
        ].contains(stage)) {
      return PopScope(
          canPop: !flow.busy,
          child: Scaffold(backgroundColor: Colors.white, body: VerificationPanel(state: flow, controller: controller)));
    }
    final title = switch (flow.step) {
      ApplicationStep.details => 'Apply to rent',
      ApplicationStep.verification => 'Verify your identity',
      ApplicationStep.review => 'Review application',
      ApplicationStep.submitted => 'Application submitted',
    };
    return PopScope(
        canPop: !flow.busy,
        child: Scaffold(
          appBar: AppBar(
              title: Text(title, style: ApplicationStyles.heading),
              centerTitle: true,
              foregroundColor: Tokens.primaryNavy,
              backgroundColor: Tokens.card,
              leading: IconButton(
                  tooltip: 'Back',
                  icon: const Icon(Icons.arrow_back),
                  onPressed: flow.busy
                      ? null
                      : () {
                          if (flow.step == ApplicationStep.verification || flow.step == ApplicationStep.review) {
                            controller.backToDetails();
                          } else {
                            Navigator.of(context).maybePop();
                          }
                        })),
          backgroundColor: Tokens.card,
          bottomNavigationBar: flow.step == ApplicationStep.details
              ? SafeArea(
                  top: false,
                  minimum: const EdgeInsets.all(Tokens.gutter),
                  child: FilledButton(
                      style: ApplicationStyles.button,
                      onPressed: flow.busy || flow.loading ? null : controller.continueToVerification,
                      child: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Flexible(child: Text('Continue')),
                        SizedBox(width: 12),
                        Icon(Icons.arrow_forward, size: 19)
                      ])))
              : null,
          body: SafeArea(
              top: false,
              child: ListView(physics: Tokens.scroll, padding: const EdgeInsets.all(Tokens.gutter), children: [
                if (flow.step != ApplicationStep.submitted) ...[
                  _ApplicationProgress(step: flow.step),
                  const SizedBox(height: Tokens.s24),
                ],
                if (flow.error != null) ...[
                  Semantics(liveRegion: true, child: Text(flow.error!, style: Theme.of(context).textTheme.bodyMedium)),
                  if (flow.restoreFailed)
                    Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton(
                            onPressed: flow.busy || flow.loading ? null : controller.restore,
                            child: const Text('Retry loading saved progress'))),
                  const SizedBox(height: Tokens.s16),
                ],
                if (flow.step == ApplicationStep.details)
                  ApplicationDetailsView(
                      card: widget.card, state: flow, controller: controller, requirements: widget.requirements),
                if (flow.step == ApplicationStep.verification && flow.session != null)
                  VerificationPanel(state: flow, controller: controller),
                if (flow.step == ApplicationStep.review) ...[
                  ApplicationPropertySummary(card: widget.card),
                  if (widget.card.moveInCost != null) ...[
                    const SizedBox(height: Tokens.s16),
                    MoveInCostCard(cost: widget.card.moveInCost!, monthlyCentavos: widget.card.priceCentavos!),
                  ],
                  const SizedBox(height: Tokens.s24),
                  _ReviewRow(label: 'Move-in date', value: DateFormat.yMMMd().format(flow.moveIn)),
                  _ReviewRow(label: 'Occupants', value: '${flow.occupants}'),
                  _ReviewRow(label: 'Rental term', value: '${flow.termMonths} months'),
                  if (flow.message.isNotEmpty) _ReviewRow(label: 'Message to owner', value: flow.message),
                  ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.verified_user_outlined, color: Tokens.primaryBlue),
                      title: Text(flow.session?.status == VerificationStatus.verified
                          ? 'Identity verified'
                          : 'Identity pending review'),
                      subtitle: const Text('Private identity evidence is not sent to the owner.')),
                  const SizedBox(height: Tokens.s16),
                  const Text(
                      'Applying does not reserve this place. The owner will review your application after you submit it.'),
                  const PolicyAgreementNote(
                      prefix: 'By submitting, you agree to our ',
                      links: [('Terms of service', 'terms'), ('Privacy policy', 'privacy')]),
                  const SizedBox(height: Tokens.s24),
                  FilledButton(
                      onPressed: flow.busy ? null : controller.submit,
                      child: const Text('Submit application to owner')),
                  TextButton(
                      onPressed: flow.busy ? null : controller.backToDetails,
                      child: const Text('Edit application details')),
                ],
                if (flow.step == ApplicationStep.submitted) ...[
                  const SizedBox(height: Tokens.s40),
                  const Icon(Icons.check_circle_outline, size: 72, color: Tokens.primaryBlue),
                  const SizedBox(height: Tokens.s24),
                  Text('Sent to the owner',
                      style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
                  const SizedBox(height: Tokens.s16),
                  const Text(
                      'Your application is saved and has been sent to the owner for review. This does not reserve the place.',
                      textAlign: TextAlign.center),
                  const SizedBox(height: Tokens.s16),
                  SelectableText('Application: ${flow.applicationId}', textAlign: TextAlign.center),
                  const SizedBox(height: Tokens.s24),
                  FilledButton(onPressed: () => Navigator.of(context).maybePop(), child: const Text('Done')),
                ],
              ])),
        ));
  }
}

class _ApplicationProgress extends StatelessWidget {
  const _ApplicationProgress({required this.step});
  final ApplicationStep step;
  @override
  Widget build(BuildContext context) => Column(children: [
        SizedBox(
            height: 36,
            child: Stack(alignment: Alignment.center, children: [
              Row(children: [
                const Spacer(),
                for (var i = 0; i < 2; i++)
                  Expanded(
                      flex: 2,
                      child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 26),
                          child: Row(children: [
                            Expanded(
                                child: Divider(
                                    color: i <= step.index ? ApplicationStyles.blue : ApplicationStyles.border)),
                            Expanded(
                                child:
                                    Divider(color: i < step.index ? ApplicationStyles.blue : ApplicationStyles.border)),
                          ]))),
                const Spacer(),
              ]),
              Row(children: [
                for (var i = 0; i < 3; i++)
                  Expanded(
                      child: Center(
                          child: CircleAvatar(
                              radius: 18,
                              backgroundColor: i <= step.index ? ApplicationStyles.blue : ApplicationStyles.pale,
                              foregroundColor: i <= step.index ? Colors.white : Tokens.primaryNavy,
                              child: Text('${i + 1}')))),
              ]),
            ])),
        const SizedBox(height: Tokens.s8),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          for (var i = 0; i < 3; i++)
            Expanded(
                child: Text(['Application details', 'Verify identity', 'Review'][i],
                    style: Theme.of(context)
                        .textTheme
                        .labelSmall
                        ?.copyWith(color: i == step.index ? ApplicationStyles.blue : ApplicationStyles.muted),
                    textAlign: TextAlign.center)),
        ]),
      ]);
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(bottom: Tokens.s16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: Tokens.s4),
        Text(value),
      ]));
}
