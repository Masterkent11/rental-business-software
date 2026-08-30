import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/booking_repository.dart';
import '../../design/money.dart';
import '../../design/tokens.dart';

/// Hold, then pay. The screen that turns a browsed listing into a paid stay.
///
/// The amount shown here is never the calendar screen's own arithmetic: it is
/// re-read from `payment-intent`, priced server-side off the listing — "the
/// amount is never the client's."
///
/// Paying calls the sandbox confirmation directly rather than opening
/// `redirectUrl`: there is no real hosted checkout page yet (ADR-0008), and
/// that field is a deliberately non-resolvable placeholder.
class BookingCheckoutScreen extends ConsumerStatefulWidget {
  const BookingCheckoutScreen({
    required this.resourceId,
    required this.checkIn,
    required this.checkOut,
    super.key,
  });

  final String resourceId;
  final DateTime checkIn;
  final DateTime checkOut;

  @override
  ConsumerState<BookingCheckoutScreen> createState() =>
      _BookingCheckoutScreenState();
}

class _BookingCheckoutScreenState extends ConsumerState<BookingCheckoutScreen> {
  BookingHoldView? _hold;
  PaymentIntentView? _intent;
  Object? _loadError;
  bool _paying = false;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _loadError = null;
      _hold = null;
      _intent = null;
    });

    try {
      final repo = ref.read(bookingRepositoryProvider);
      final hold = await repo.placeHold(
        resourceId: widget.resourceId,
        startsOn: widget.checkIn,
        endsOn: widget.checkOut,
      );
      final intent = await repo.startPaymentIntent(hold.id);
      if (!mounted) return;

      setState(() {
        _hold = hold;
        _intent = intent;
      });

      // Redraws the expiry countdown once a second. Only the display changes;
      // the server's own clock is what the payment attempt is actually
      // checked against.
      _ticker?.cancel();
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() {});
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _loadError = error);
    }
  }

  Future<void> _pay() async {
    final hold = _hold;
    final intent = _intent;
    if (hold == null || intent == null) return;

    setState(() => _paying = true);
    try {
      final result = await ref.read(bookingRepositoryProvider).confirmSandboxPayment(
            occupancyId: hold.id,
            paymentId: intent.paymentId,
          );
      if (!mounted) return;

      final stayId = result.stayId;
      if (!result.applied || stayId == null) {
        throw const ApiException('Payment did not go through. Try again.');
      }

      HapticFeedback.mediumImpact();
      // Clears the whole booking flow (dates + checkout) off the stack —
      // going back from the confirmation should not land on a dead checkout.
      context.go(Routes.booking(stayId));
    } on ApiException catch (error) {
      if (!mounted) return;
      if (error.isNotFound) {
        // The hold expired mid-checkout, or this payment was already
        // resolved. Retrying here cannot succeed — the only honest move is
        // back to the calendar to try for new nights.
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('That hold is no longer available. Pick dates again.'),
          ),
        );
        Navigator.of(context).maybePop();
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loadError != null) {
      final error = _loadError;
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Tokens.gutter),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Could not hold these nights',
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: Tokens.s8),
                Text(
                  error is ApiException ? error.message : '$error',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: Tokens.s16),
                FilledButton(onPressed: _start, child: const Text('Try again')),
              ],
            ),
          ),
        ),
      );
    }

    final hold = _hold;
    final intent = _intent;
    if (hold == null || intent == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final nightly = intent.nights > 0 ? intent.amountCentavos ~/ intent.nights : 0;
    final remaining = hold.expiresAt?.difference(DateTime.now());
    final expired = remaining != null && remaining.isNegative;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Review and pay'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: ListView(
        physics: Tokens.scroll,
        padding: const EdgeInsets.all(Tokens.gutter),
        children: [
          Text(
            '${intent.nights} night${intent.nights == 1 ? "" : "s"}',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: Tokens.s8),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${Money.peso(nightly)} × ${intent.nights}',
                  style: theme.textTheme.bodyMedium,
                ),
              ),
              Text(Money.peso(intent.amountCentavos), style: theme.textTheme.bodyMedium),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: Tokens.s16),
            child: Divider(height: 1),
          ),
          Row(
            children: [
              Text('Total', style: theme.textTheme.titleMedium),
              const Spacer(),
              Text(Money.peso(intent.amountCentavos), style: theme.textTheme.headlineSmall),
            ],
          ),
          const SizedBox(height: Tokens.s16),
          Text(
            'Paying confirms the booking. There is no approval step.',
            style: theme.textTheme.bodySmall,
          ),
          if (remaining != null) ...[
            const SizedBox(height: Tokens.s16),
            Text(
              expired
                  ? 'This hold has expired — go back and pick dates again.'
                  : 'Hold expires in ${_mmss(remaining)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: expired ? theme.colorScheme.error : null,
              ),
            ),
          ],
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(Tokens.gutter),
          child: FilledButton(
            onPressed: _paying || expired ? null : _pay,
            child: _paying
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text('Pay ${Money.peso(intent.amountCentavos)}'),
          ),
        ),
      ),
    );
  }

  static String _mmss(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}
