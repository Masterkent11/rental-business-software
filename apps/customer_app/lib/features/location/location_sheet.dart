import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/marketplace_repository.dart';
import '../../design/tokens.dart';
import 'location_controller.dart';

Future<void> showLocationSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => const _LocationSheet(),
  );
}

class _LocationSheet extends ConsumerWidget {
  const _LocationSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(locationProvider);
    final controller = ref.read(locationProvider.notifier);
    final areas = ref.watch(areasProvider);
    final place = state.place;

    Future<void> useLocation() async {
      HapticFeedback.selectionClick();
      await controller.useCurrentLocation();
      if (context.mounted && ref.read(locationProvider).isNearMe) Navigator.of(context).pop();
    }

    return SafeArea(
      top: false,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.8),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s24),
          children: [
            Text('Where are you looking?', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 4),
            const Text(
              'Your device location is used only while you browse. It is not saved to your account.',
              style: TextStyle(fontSize: 12.5, color: Tokens.muted),
            ),
            const SizedBox(height: Tokens.s16),
            _Option(
              icon: Icons.my_location,
              label: 'Use my current location',
              selected: place is NearMePlace,
              trailing: state.locating
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : null,
              onTap: state.locating ? null : useLocation,
            ),
            if (state.problemMessage != null)
              Container(
                margin: const EdgeInsets.only(top: Tokens.s8),
                padding: const EdgeInsets.all(Tokens.s12),
                decoration:
                    BoxDecoration(color: const Color(0xFFFFF4E5), borderRadius: BorderRadius.circular(Tokens.rSm)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(state.problemMessage!, style: const TextStyle(fontSize: 13, color: Color(0xFF7A4B00))),
                    if (state.canOpenSettings)
                      TextButton(onPressed: controller.openSettings, child: const Text('Open Settings')),
                  ],
                ),
              ),
            _Option(
              icon: Icons.public,
              label: 'Anywhere',
              selected: place is AnywherePlace,
              onTap: () {
                controller.chooseAnywhere();
                Navigator.of(context).pop();
              },
            ),
            const SizedBox(height: Tokens.s16),
            const Text('AREAS WITH LISTINGS',
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Tokens.muted, letterSpacing: 0.6)),
            const SizedBox(height: Tokens.s8),
            ...switch (areas) {
              AsyncError() => [
                  Row(
                    children: [
                      const Expanded(child: Text('Could not load areas.', style: TextStyle(color: Tokens.muted))),
                      TextButton(onPressed: () => ref.invalidate(areasProvider), child: const Text('Retry')),
                    ],
                  ),
                ],
              AsyncData(:final value) when value.isEmpty => [
                  const Text('No areas have listings yet.', style: TextStyle(color: Tokens.muted))
                ],
              AsyncData(:final value) => [
                  for (final area in value)
                    _Option(
                      icon: Icons.location_city_outlined,
                      label: area.cityLabel,
                      caption: _counts(area),
                      selected: place is AreaPlace && place.cityLabel == area.cityLabel,
                      onTap: () {
                        controller.chooseCity(area.cityLabel);
                        Navigator.of(context).pop();
                      },
                    ),
                ],
              _ => [
                  const Padding(padding: EdgeInsets.all(Tokens.s16), child: Center(child: CircularProgressIndicator()))
                ],
            },
          ],
        ),
      ),
    );
  }

  static String _counts(AreaView area) => [
        if (area.rentCount > 0) '${area.rentCount} for rent',
        if (area.saleCount > 0) '${area.saleCount} for sale',
      ].join(' · ');
}

class _Option extends StatelessWidget {
  const _Option({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.caption,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final String? caption;
  final bool selected;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4),
      leading: Icon(icon, color: Tokens.primaryNavy),
      title: Text(label,
          style: TextStyle(fontWeight: selected ? FontWeight.w700 : FontWeight.w500, color: Tokens.primaryNavy)),
      subtitle: caption == null || caption!.isEmpty ? null : Text(caption!),
      trailing: trailing ?? (selected ? const Icon(Icons.check, color: Tokens.primaryNavy) : null),
      onTap: onTap,
    );
  }
}
