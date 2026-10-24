import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/api_client.dart';
import '../../data/tenant_home_repository.dart';
import '../../design/app_image.dart';
import '../../design/components.dart';
import '../../design/osm_map.dart';
import '../saved/saved_controller.dart';
import 'domain/tenant_home.dart';
import 'home_actions.dart';
import 'widgets/home_cards.dart';

class TenancyDetailScreen extends ConsumerWidget {
  const TenancyDetailScreen({required this.tenancyId, super.key});
  final String tenancyId;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
      backgroundColor: Colors.white,
      body: ref.watch(tenancyDetailsProvider(tenancyId)).when(
            skipLoadingOnRefresh: false,
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => SafeArea(
                child: Column(children: [
              Align(alignment: Alignment.centerLeft, child: BackButton(onPressed: () => Navigator.pop(context))),
              Expanded(
                  child: ErrorState(
                      message: error is ApiException ? error.message : 'Could not load this tenancy.',
                      onRetry: () => ref.invalidate(tenancyDetailsProvider(tenancyId))))
            ])),
            data: (home) => _TenancyDetails(home: home),
          ));
}

class _TenancyDetails extends ConsumerStatefulWidget {
  const _TenancyDetails({required this.home});
  final TenantHome home;
  @override
  ConsumerState<_TenancyDetails> createState() => _TenancyDetailsState();
}

class _TenancyDetailsState extends ConsumerState<_TenancyDetails> {
  int _tab = 0, _photo = 0;
  bool _expanded = false, _allAmenities = false;
  @override
  Widget build(BuildContext context) {
    final home = widget.home;
    return ListView(padding: const EdgeInsets.only(bottom: 100), children: [
      SizedBox(
          height: 365,
          child: Stack(fit: StackFit.expand, children: [
            if (home.photos.isEmpty)
              const AppImage(url: '')
            else
              PageView.builder(
                  itemCount: home.photos.length,
                  onPageChanged: (index) => setState(() => _photo = index),
                  itemBuilder: (context, index) => GestureDetector(
                      onTap: () => _gallery(context, home.photos, index), child: AppImage(url: home.photos[index]))),
            Positioned(
                top: 10, left: 12, child: _circle('Back', Icons.arrow_back_ios_new, () => Navigator.pop(context))),
            if (home.listingId != null)
              Positioned(
                  top: 10,
                  right: 12,
                  child: Row(children: [
                    _circle('Share public property', Icons.ios_share, () async {
                      await Clipboard.setData(ClipboardData(text: home.title));
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                            content: Text('Property name copied. Private tenancy details are not shared.')));
                      }
                    }),
                    const SizedBox(width: 8),
                    _circle('Save property',
                        ref.watch(isSavedProvider(home.listingId!)) ? Icons.favorite : Icons.favorite_border, () async {
                      try {
                        await ref.read(savedIdsProvider.notifier).toggle(home.listingId!);
                      } on ApiException catch (error) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
                        }
                      }
                    }),
                  ])),
            Positioned(
                right: 16,
                bottom: 22,
                child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: const Color(0x99000000), borderRadius: BorderRadius.circular(20)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.photo_library_outlined, size: 12, color: Colors.white),
                      const SizedBox(width: 4),
                      Text(home.photos.isEmpty ? 'No photos' : '${_photo + 1}/${home.photos.length}',
                          style: const TextStyle(color: Colors.white, fontSize: 12)),
                    ]))),
          ])),
      Container(
          transform: Matrix4.translationValues(0, -10, 0),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
          decoration:
              const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(home.title,
                style: const TextStyle(fontSize: 25, height: 1.2, fontWeight: FontWeight.w700, color: homeNavy)),
            const SizedBox(height: 5),
            Text(home.subtitle, style: const TextStyle(fontSize: 14, color: homeMuted)),
          ])),
      DecoratedBox(
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: homeBorder))),
          child: Row(children: [
            for (final (index, label) in ['Overview', 'Amenities', 'Location', 'Photos'].indexed)
              Expanded(
                  child: InkWell(
                      onTap: () => setState(() => _tab = index),
                      child: Semantics(
                          selected: index == _tab,
                          child: Column(children: [
                            Padding(
                                padding: const EdgeInsets.symmetric(vertical: 13),
                                child: Text(label,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: index == _tab ? FontWeight.w600 : FontWeight.w400,
                                        color: index == _tab ? homeNavy : homeMuted))),
                            Container(
                                width: 64,
                                height: 3,
                                decoration: BoxDecoration(
                                    color: index == _tab ? homeNavy : Colors.transparent,
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(3)))),
                          ]))))
          ])),
      if (_tab == 0) ...[
        Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _attribute(Icons.apartment_outlined, home.propertyType.replaceAll('_', ' '), 'Property Type'),
              _attribute(Icons.meeting_room_outlined, home.unit, 'Unit Number'),
              _attribute(Icons.location_on_outlined, home.area, 'Address'),
            ])),
        _section(
            'About this property',
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(home.description.isEmpty ? 'No description has been provided.' : home.description,
                  maxLines: _expanded ? null : 3,
                  overflow: _expanded ? null : TextOverflow.ellipsis,
                  style: const TextStyle(color: Color(0xFF627089), fontSize: 13, height: 1.5)),
              if (home.description.isNotEmpty)
                TextButton(
                    onPressed: () => setState(() => _expanded = !_expanded),
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, foregroundColor: const Color(0xFF1654C0)),
                    child: Text(_expanded ? 'Show less' : 'View full details  ›')),
            ])),
        _section('Your tenancy', LeasePeriodSummary(home: home, showProgress: true)),
        _section('Owner / Landlord', _ownerContact(home)),
        _section('Property amenities', _amenities(home)),
        Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
            child: OutlinedButton.icon(
                onPressed: () => homeSheet(context, 'Rules & Guidelines',
                    Text(home.rules.isEmpty ? 'No house rules have been provided.' : home.rules.join('\n\n'))),
                icon: const Icon(Icons.description_outlined),
                label: const Text('View Rules & Guidelines'),
                style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    foregroundColor: homeNavy,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))))),
      ] else if (_tab == 1)
        _section('Property amenities', _amenities(home))
      else if (_tab == 2)
        _section(
            'Location',
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(home.address),
              const SizedBox(height: 16),
              if (home.latitude != null && home.longitude != null)
                OsmMap(latitude: home.latitude!, longitude: home.longitude!, approximate: false, height: 300)
              else
                const Text('Map coordinates are not available.')
            ]))
      else
        _section(
            'Photos',
            home.photos.isEmpty
                ? const Text('No photos available.')
                : Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final (index, url) in home.photos.indexed)
                      GestureDetector(
                          key: ValueKey('tenancy-photo-$index'),
                          onTap: () => _gallery(context, home.photos, index),
                          child: SizedBox(
                              width: 150,
                              height: 120,
                              child: ClipRRect(borderRadius: BorderRadius.circular(12), child: AppImage(url: url))))
                  ])),
    ]);
  }

  Widget _circle(String label, IconData icon, VoidCallback onTap) => IconButton(
      tooltip: label,
      onPressed: onTap,
      style: IconButton.styleFrom(
          backgroundColor: Colors.white, foregroundColor: homeNavy, minimumSize: const Size(42, 42)),
      icon: Icon(icon, size: 22));
  Widget _ownerContact(TenantHome home) => HomeCard(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
      child: LayoutBuilder(builder: (context, constraints) {
        final identity = Row(children: [
          const CircleAvatar(
              radius: 23, backgroundColor: Color(0xFFF0F3F8), child: Icon(Icons.person_outline, color: homeNavy)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(home.landlordName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: homeNavy)),
            const SizedBox(height: 4),
            const Text('Property management', style: TextStyle(fontSize: 12, color: homeMuted)),
          ])),
        ]);
        final message = OutlinedButton(
            onPressed: () => messageLandlord(context, home),
            style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 38),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('Message'));
        if (constraints.maxWidth < 270 || MediaQuery.textScalerOf(context).scale(13) > 18) {
          return Column(
              children: [identity, const SizedBox(height: 8), Align(alignment: Alignment.centerRight, child: message)]);
        }
        return Row(children: [Expanded(child: identity), const SizedBox(width: 8), message]);
      }));
  Widget _attribute(IconData icon, String value, String label) => Expanded(
          child: Column(children: [
        Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFFF6F7FA)),
            child: Icon(icon, size: 24, color: homeNavy)),
        const SizedBox(height: 6),
        Text(value.isEmpty ? 'Not provided' : value,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: homeNavy)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: homeMuted))
      ]));
  Widget _section(String title, Widget child) => Container(
      padding: const EdgeInsets.fromLTRB(18, 17, 18, 17),
      decoration: const BoxDecoration(border: Border(top: BorderSide(color: homeBorder))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: homeNavy)),
        const SizedBox(height: 12),
        child
      ]));
  Widget _amenities(TenantHome home) {
    if (home.amenities.isEmpty) return const Text('No amenities have been provided.');
    final values = _allAmenities ? home.amenities : home.amenities.take(7).toList();
    return HomeCard(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        child: LayoutBuilder(
            builder: (context, constraints) => Wrap(runSpacing: 20, children: [
                  for (final value in values)
                    SizedBox(
                        width: constraints.maxWidth / 4,
                        child: Column(children: [
                          Icon(_amenityIcon(value), color: homeNavy, size: 25),
                          const SizedBox(height: 8),
                          Text(value,
                              textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: homeNavy))
                        ])),
                  if (!_allAmenities && home.amenities.length > 7)
                    SizedBox(
                        width: constraints.maxWidth / 4,
                        child: InkWell(
                            onTap: () => setState(() => _allAmenities = true),
                            child: const Column(children: [
                              Icon(Icons.more_horiz, color: homeNavy, size: 25),
                              SizedBox(height: 8),
                              Text('More', style: TextStyle(fontSize: 10, color: homeNavy))
                            ]))),
                ])));
  }

  IconData _amenityIcon(String value) {
    final key = value.toLowerCase();
    if (key.contains('pool')) return Icons.pool_outlined;
    if (key.contains('gym')) return Icons.fitness_center_outlined;
    if (key.contains('security')) return Icons.verified_user_outlined;
    if (key.contains('park')) return Icons.directions_car_outlined;
    if (key.contains('elevator')) return Icons.elevator_outlined;
    if (key.contains('wifi')) return Icons.wifi;
    return Icons.check_circle_outline;
  }

  void _gallery(BuildContext context, List<String> urls, int index) =>
      Navigator.push(context, MaterialPageRoute<void>(builder: (context) => _TenancyGallery(urls: urls, index: index)));
}

class _TenancyGallery extends StatefulWidget {
  const _TenancyGallery({required this.urls, required this.index});
  final List<String> urls;
  final int index;
  @override
  State<_TenancyGallery> createState() => _TenancyGalleryState();
}

class _TenancyGalleryState extends State<_TenancyGallery> {
  late final _controller = PageController(initialPage: widget.index);
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      backgroundColor: Colors.black,
      appBar:
          AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white, title: const Text('Property photos')),
      body: PageView.builder(
          controller: _controller,
          itemCount: widget.urls.length,
          itemBuilder: (context, index) =>
              InteractiveViewer(child: AppImage(url: widget.urls[index], fit: BoxFit.contain))));
}
