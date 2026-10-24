import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design/app_image.dart';
import '../../../design/tokens.dart';
import '../domain/tenant_home.dart';

const homeNavy = Color(0xFF0C2348);
const homeMuted = Color(0xFF7183A4);
const homeBorder = Color(0xFFEEF0F3);

class HomeCard extends StatelessWidget {
  const HomeCard({required this.child, this.padding = const EdgeInsets.all(16), super.key});
  final Widget child;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Container(
      padding: padding,
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: homeBorder)),
      child: child);
}

class ActiveRentalHeroCard extends StatelessWidget {
  const ActiveRentalHeroCard({required this.home, required this.onTap, super.key});
  final TenantHome home;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
      button: true,
      label: 'View tenancy details for ${home.title}',
      child: Material(
        borderRadius: BorderRadius.circular(20),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
            onTap: onTap,
            child: AspectRatio(
                aspectRatio: 1.23,
                child: Stack(fit: StackFit.expand, children: [
                  AppImage(url: home.hero),
                  const DecoratedBox(
                      decoration: BoxDecoration(
                          gradient: LinearGradient(
                              begin: Alignment.center,
                              end: Alignment.bottomCenter,
                              colors: [Colors.transparent, Color(0xB3000000)]))),
                  Positioned(
                      left: 18,
                      right: 58,
                      bottom: 18,
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(home.title,
                                style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w700, color: Colors.white),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Text(home.subtitle,
                                style: const TextStyle(fontSize: 13, color: Colors.white),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis),
                          ])),
                  Positioned(
                      right: 16,
                      bottom: 28,
                      child: Container(
                          width: 36,
                          height: 36,
                          decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x55FFFFFF)),
                          child: const Icon(Icons.chevron_right, color: Colors.white, size: 25))),
                ]))),
      ));
}

class UpcomingRentCard extends StatelessWidget {
  const UpcomingRentCard({required this.home, required this.onInvoice, super.key});
  final TenantHome home;
  final VoidCallback onInvoice;
  @override
  Widget build(BuildContext context) {
    final invoice = home.nextInvoice;
    return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: homeNavy, borderRadius: BorderRadius.circular(20)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('UPCOMING RENT', style: TextStyle(fontSize: 12, letterSpacing: 1.3, color: Color(0xFFD7E3F4))),
          const SizedBox(height: 8),
          Text(
              invoice == null
                  ? (home.invoices.isEmpty ? 'No invoice yet' : 'All caught up')
                  : peso(invoice.outstanding),
              style: const TextStyle(fontSize: 36, height: 1.1, fontWeight: FontWeight.w700, color: Colors.white)),
          const SizedBox(height: 10),
          LayoutBuilder(builder: (context, constraints) {
            final compact = constraints.maxWidth < 290 || MediaQuery.textScalerOf(context).scale(15) > 20;
            final due = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                  invoice == null
                      ? 'No outstanding invoice'
                      : 'Due on ${DateFormat('MMM d, yyyy').format(invoice.dueOn)}',
                  style: const TextStyle(fontSize: 15, color: Colors.white)),
              if (invoice != null) ...[
                const SizedBox(height: 4),
                Row(children: [
                  const Icon(Icons.calendar_month_outlined, size: 17, color: Color(0xFFFFD23E)),
                  const SizedBox(width: 7),
                  Flexible(
                      child: Text(dueLabel(invoice.dueOn, home.today),
                          style: const TextStyle(color: Color(0xFFFFD23E), fontSize: 15)))
                ])
              ],
            ]);
            final button = FilledButton.icon(
                onPressed: onInvoice,
                style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: homeNavy,
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    minimumSize: const Size(0, 44)),
                iconAlignment: IconAlignment.end,
                icon: const Icon(Icons.arrow_forward, size: 16),
                label: const Text('View invoice', style: TextStyle(fontSize: 13)));
            if (invoice == null) return due;
            if (compact) {
              return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                due,
                const SizedBox(height: 12),
                Align(alignment: Alignment.centerRight, child: button),
              ]);
            }
            return Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(child: due),
              const SizedBox(width: 8),
              button,
            ]);
          }),
        ]));
  }
}

class HomeActionCard extends StatelessWidget {
  const HomeActionCard(
      {required this.title, required this.description, required this.icon, required this.onTap, super.key});
  final String title, description;
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: homeBorder)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
          onTap: onTap,
          child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFFF5F6F8)),
                    child: Icon(icon, size: 29, color: homeNavy)),
                const SizedBox(height: 10),
                Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: homeNavy)),
                const SizedBox(height: 5),
                Text(description, style: const TextStyle(fontSize: 13, height: 1.45, color: homeMuted)),
              ]))));
}

class LeasePeriodSummary extends StatelessWidget {
  const LeasePeriodSummary({required this.home, this.showProgress = false, super.key});
  final TenantHome home;
  final bool showProgress;
  @override
  Widget build(BuildContext context) => HomeCard(
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Padding(
            padding: EdgeInsets.only(right: 14, top: 4),
            child: Icon(Icons.calendar_month_outlined, color: homeNavy, size: 27)),
        Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(
                child:
                    Text('Lease Period', style: TextStyle(fontSize: 13, color: homeNavy, fontWeight: FontWeight.w500))),
            Flexible(
                child: Text(home.remaining(home.today),
                    textAlign: TextAlign.end, style: const TextStyle(fontSize: 11, color: homeMuted)))
          ]),
          const SizedBox(height: 6),
          Text(home.leaseDates, style: const TextStyle(fontSize: 12, color: homeMuted)),
          if (showProgress) ...[
            const SizedBox(height: 10),
            ClipRRect(
                borderRadius: BorderRadius.circular(Tokens.rSm),
                child: LinearProgressIndicator(
                    value: home.progress(home.today),
                    minHeight: 9,
                    color: homeNavy,
                    backgroundColor: const Color(0xFFDDE3EE)))
          ],
        ])),
      ]));
}
