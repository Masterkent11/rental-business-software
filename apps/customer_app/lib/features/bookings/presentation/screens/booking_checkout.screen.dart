import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../app/composition_root.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/domain/value_objects/money.value_object.dart';
import '../../../listings/domain/entities/listing.entity.dart';
import '../../domain/entities/booking_hold.entity.dart';
import '../../domain/entities/payment_intent.entity.dart';

typedef CheckoutArgs = ({
  Listing listing,
  DateTime startsOn,
  DateTime endsOn,
  int nights,
  int totalCentavos,
});

class BookingCheckoutScreen extends ConsumerStatefulWidget {
  const BookingCheckoutScreen({required this.args, super.key});
  final CheckoutArgs args;

  @override
  ConsumerState<BookingCheckoutScreen> createState() => _BookingCheckoutScreenState();
}

class _BookingCheckoutScreenState extends ConsumerState<BookingCheckoutScreen> {
  bool _loading = true;
  BookingHold? _hold;
  PaymentIntent? _intent;
  String? _error;
  bool _paying = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final hold = await ref.read(placeBookingHoldUseCaseProvider).call(
            resourceId: widget.args.listing.resourceId.isNotEmpty
                ? widget.args.listing.resourceId
                : widget.args.listing.id,
            startsOn: widget.args.startsOn,
            endsOn: widget.args.endsOn,
          );

      final intent = await ref
          .read(startBookingPaymentUseCaseProvider)
          .call(hold.id);

      if (mounted) {
        setState(() {
          _loading = false;
          _hold = hold;
          _intent = intent;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _confirmPayment() async {
    if (_hold == null || _intent == null) return;
    setState(() => _paying = true);

    try {
      final res = await ref.read(confirmSandboxPaymentUseCaseProvider).call(
            occupancyId: _hold!.id,
            paymentId: _intent!.paymentId,
          );

      if (res.applied) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Booking confirmed!')),
          );
          context.go('/bookings');
        }
      } else {
        if (mounted) setState(() => _error = 'Payment not applied');
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFmt = DateFormat('MMM d, yyyy');

    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Confirm and Pay')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null && _hold == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Confirm and Pay')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Tokens.gutter),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Could not hold these nights', style: theme.textTheme.titleMedium),
                const SizedBox(height: Tokens.s8),
                Text(_error!, textAlign: TextAlign.center, style: theme.textTheme.bodySmall),
                const SizedBox(height: Tokens.s16),
                FilledButton(onPressed: _start, child: const Text('Try again')),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Confirm and Pay')),
      body: ListView(
        padding: const EdgeInsets.all(Tokens.gutter),
        children: [
          Container(
            padding: const EdgeInsets.all(Tokens.s16),
            decoration: BoxDecoration(
              color: Tokens.surfaceMuted,
              borderRadius: Tokens.borderLg,
              border: Border.all(color: Tokens.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.args.listing.title,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: Tokens.s4),
                Text(widget.args.listing.propertyName, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          const SizedBox(height: Tokens.s20),
          Text('Trip details', style: theme.textTheme.titleMedium),
          const SizedBox(height: Tokens.s12),
          ListTile(
            title: const Text('Dates'),
            subtitle: Text('${dateFmt.format(widget.args.startsOn)} – ${dateFmt.format(widget.args.endsOn)}'),
            trailing: Text('${widget.args.nights} nights'),
            contentPadding: EdgeInsets.zero,
          ),
          const Divider(),
          ListTile(
            title: const Text('Total payment'),
            trailing: Text(
              Money.formatPesos(widget.args.totalCentavos),
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            contentPadding: EdgeInsets.zero,
          ),
          if (_error != null) ...[
            const SizedBox(height: Tokens.s12),
            Text(_error!, style: const TextStyle(color: Tokens.danger, fontSize: 13)),
          ],
          const SizedBox(height: Tokens.s32),
          FilledButton(
            onPressed: _paying ? null : _confirmPayment,
            child: _paying
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Tokens.surface),
                  )
                : Text('Pay ${Money.formatPesos(widget.args.totalCentavos)}'),
          ),
        ],
      ),
    );
  }
}
