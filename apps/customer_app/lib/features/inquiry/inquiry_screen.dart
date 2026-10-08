import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/ids.dart';
import '../../data/listing_repository.dart';
import '../../data/marketplace_repository.dart';
import '../../data/messaging_repository.dart';
import '../../design/app_image.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';

int? parseBudgetCentavos(String raw) {
  final digits = raw.replaceAll(RegExp(r'[^0-9.]'), '');
  if (digits.isEmpty) return null;
  final value = double.tryParse(digits);
  if (value == null || value <= 0) return null;
  return (value * 100).round();
}

String composeInquiryMessage(String typed, List<String> questions) {
  final message = typed.trim();
  if (message.isNotEmpty) return message;
  if (questions.isNotEmpty) return questions.join('\n');
  return '';
}

class InquiryScreen extends ConsumerStatefulWidget {
  const InquiryScreen({required this.listingId, super.key});

  final String listingId;

  @override
  ConsumerState<InquiryScreen> createState() => _InquiryScreenState();
}

class _InquiryScreenState extends ConsumerState<InquiryScreen> {
  final _message = TextEditingController();
  final _budget = TextEditingController();
  final Set<String> _questions = {kSuggestedInquiryQuestions.first};
  final String _clientRef = newUuid();
  bool _shareBudget = false;
  bool _sending = false;
  String? _error;
  InquiryResult? _result;

  @override
  void dispose() {
    _message.dispose();
    _budget.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final message = composeInquiryMessage(_message.text, _questions.toList());
    if (message.isEmpty) {
      setState(() => _error = 'Pick a question or write a short message.');
      return;
    }
    final budget = _shareBudget ? parseBudgetCentavos(_budget.text) : null;
    if (_shareBudget && budget == null) {
      setState(() => _error = 'Enter your budget in pesos, or turn off budget sharing.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final result = await ref.read(marketplaceRepositoryProvider).submitInquiry(
            listingId: widget.listingId,
            message: message,
            questions: _questions.toList(),
            buyerBudgetCentavos: budget,
            clientRef: _clientRef,
          );
      HapticFeedback.mediumImpact();
      ref.invalidate(openInquiryProvider(widget.listingId));
      ref.invalidate(myInquiriesProvider);
      ref.read(inboxProvider.notifier).refreshQuietly();
      if (mounted) setState(() => _result = result);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(listingDetailProvider(widget.listingId));
    final existing = ref.watch(openInquiryProvider(widget.listingId));
    final card = detail.valueOrNull?.card;

    return Scaffold(
      backgroundColor: Tokens.canvas,
      appBar: AppBar(
        title: const Text('Inquire'),
        backgroundColor: Tokens.canvas,
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new, size: 18), onPressed: () => Navigator.of(context).maybePop()),
      ),
      body: switch ((detail, existing)) {
        (AsyncError(), _) => _Problem(
            message: 'We could not load this property.',
            onRetry: () => ref.invalidate(listingDetailProvider(widget.listingId)),
          ),
        (AsyncData(value: null), _) => const _Problem(message: 'This property is no longer listed.'),
        _ when card == null || existing.isLoading => const Center(child: CircularProgressIndicator()),
        _ => _result != null
            ? _Sent(card: card, result: _result!)
            : existing.valueOrNull != null
                ? _Sent(card: card, result: InquiryResult(inquiry: existing.valueOrNull!, alreadyOpen: true))
                : _form(card),
      },
    );
  }

  Widget _form(ListingCardView card) {
    final theme = Theme.of(context);
    return ListView(
      physics: Tokens.scroll,
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s40),
      children: [
        _ListingSummary(card: card),
        const SizedBox(height: Tokens.s16),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Tokens.rSm),
            border: Border.all(color: Tokens.hairline),
          ),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: Tokens.primaryNavy,
                    borderRadius: BorderRadius.circular(Tokens.rSm - 2),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'Inquire',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: InkWell(
                  onTap: () => context.pushReplacement(Routes.viewing(widget.listingId)),
                  borderRadius: BorderRadius.circular(Tokens.rSm - 2),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    alignment: Alignment.center,
                    child: const Text(
                      'Schedule Viewing',
                      style: TextStyle(
                        color: Tokens.muted,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: Tokens.s24),
        Text('What would you like to know?', style: theme.textTheme.titleLarge),
        const SizedBox(height: Tokens.s12),
        Wrap(
          spacing: Tokens.s8,
          runSpacing: Tokens.s8,
          children: [
            for (final question in kSuggestedInquiryQuestions)
              FilterChip(
                label: Text(question),
                selected: _questions.contains(question),
                showCheckmark: false,
                selectedColor: Tokens.primaryNavy,
                labelStyle: TextStyle(
                  color: _questions.contains(question) ? Colors.white : Tokens.primaryNavy,
                  fontWeight: FontWeight.w600,
                ),
                side: const BorderSide(color: Tokens.hairline),
                backgroundColor: Colors.white,
                onSelected: (on) => setState(() {
                  on ? _questions.add(question) : _questions.remove(question);
                  _error = null;
                }),
              ),
          ],
        ),
        const SizedBox(height: Tokens.s20),
        TextField(
          controller: _message,
          minLines: 3,
          maxLines: 6,
          maxLength: 2000,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            labelText: 'Message (optional)',
            hintText: 'Hi! I’m interested in this property. Please share more details.',
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(Tokens.rSm)),
          ),
          onChanged: (_) => setState(() => _error = null),
        ),
        const SizedBox(height: Tokens.s8),
        Material(
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Tokens.rSm),
            side: const BorderSide(color: Tokens.hairline),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              SwitchListTile.adaptive(
                value: _shareBudget,
                onChanged: (on) => setState(() {
                  _shareBudget = on;
                  _error = null;
                }),
                title: const Text('Share my budget privately'),
                subtitle: const Text('Only the agent or owner sees it. It is never shown publicly.'),
              ),
              if (_shareBudget)
                Padding(
                  padding: const EdgeInsets.fromLTRB(Tokens.s16, 0, Tokens.s16, Tokens.s16),
                  child: TextField(
                    controller: _budget,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                    decoration: InputDecoration(
                      prefixText: '₱ ',
                      labelText: 'Budget',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(Tokens.rSm)),
                    ),
                    onChanged: (_) => setState(() => _error = null),
                  ),
                ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: Tokens.s12),
          Text(_error!, style: const TextStyle(color: Tokens.taken, fontWeight: FontWeight.w600)),
        ],
        const SizedBox(height: Tokens.s24),
        FilledButton(
          onPressed: _sending ? null : _submit,
          style: FilledButton.styleFrom(
            backgroundColor: Tokens.primaryNavy,
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Tokens.rSm)),
          ),
          child: _sending
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
              : const Text('Send Inquiry'),
        ),
        const SizedBox(height: Tokens.s12),
        const Text(
          'Your inquiry starts a private conversation. Pricing and terms are shared there.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12.5, color: Tokens.muted),
        ),
      ],
    );
  }
}

class _ListingSummary extends StatelessWidget {
  const _ListingSummary({required this.card});

  final ListingCardView card;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Tokens.s12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Tokens.rMd),
        border: Border.all(color: Tokens.hairline),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(Tokens.rSm),
            child: SizedBox(
              width: 72,
              height: 72,
              child: AppImage(url: card.photos.isEmpty ? '' : card.photos.first, fallbackIcon: Icons.home_work_outlined, cacheWidth: 144),
            ),
          ),
          const SizedBox(width: Tokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(card.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
                const SizedBox(height: 2),
                Text(card.place, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: Tokens.muted)),
                const SizedBox(height: 4),
                Text(card.isSale ? kPriceOnInquiry : card.typeLabel, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Tokens.primaryNavy)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Sent extends StatelessWidget {
  const _Sent({required this.card, required this.result});

  final ListingCardView card;
  final InquiryResult result;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final inquiry = result.inquiry;
    return ListView(
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s24, Tokens.gutter, Tokens.s40),
      children: [
        const Icon(Icons.mark_email_read_outlined, size: 48, color: Tokens.primaryNavy),
        const SizedBox(height: Tokens.s16),
        Text(
          result.alreadyOpen ? 'You already asked about this property' : 'Inquiry sent',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall,
        ),
        const SizedBox(height: Tokens.s8),
        Text(
          result.alreadyOpen
              ? '${inquiry.partnerName} has your inquiry (${inquiry.progressLabel.toLowerCase()}). Continue in the conversation.'
              : '${inquiry.partnerName} will reply in your messages. You will get a notification.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: Tokens.muted),
        ),
        const SizedBox(height: Tokens.s24),
        _ListingSummary(card: card),
        const SizedBox(height: Tokens.s24),
        FilledButton(
          onPressed: () => context.pushReplacement(Routes.conversation(inquiry.conversationId)),
          style: FilledButton.styleFrom(backgroundColor: Tokens.primaryNavy, minimumSize: const Size.fromHeight(50)),
          child: const Text('Open conversation'),
        ),
        const SizedBox(height: Tokens.s12),
        OutlinedButton(
          onPressed: () => context.pushReplacement(Routes.viewing(card.id)),
          style: OutlinedButton.styleFrom(foregroundColor: Tokens.primaryNavy, minimumSize: const Size.fromHeight(50)),
          child: const Text('Schedule a viewing'),
        ),
      ],
    );
  }
}

class _Problem extends StatelessWidget {
  const _Problem({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Tokens.s32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, size: 36, color: Tokens.muted),
            const SizedBox(height: Tokens.s12),
            Text(message, textAlign: TextAlign.center),
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
