import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../app/router.dart';
import '../../../design/tokens.dart';
import '../application/property_search_controller.dart';
import '../domain/property_type.dart';
import '../domain/rental_mode.dart';
import 'widgets/lease_duration_sheet.dart';
import 'widgets/occupants_sheet.dart';
import 'widgets/search_mode_toggle.dart';

class PropertySearchScreen extends ConsumerStatefulWidget {
  const PropertySearchScreen({
    super.key,
    required this.propertyType,
  });

  final PropertyType propertyType;

  @override
  ConsumerState<PropertySearchScreen> createState() =>
      _PropertySearchScreenState();
}

class _PropertySearchScreenState extends ConsumerState<PropertySearchScreen> {
  late final TextEditingController _locationController;

  @override
  void initState() {
    super.initState();
    final initialLocation = ref
        .read(propertySearchFormProvider(widget.propertyType))
        .location;
    _locationController = TextEditingController(text: initialLocation);
  }

  @override
  void dispose() {
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _pickCheckIn(
    BuildContext context,
    PropertySearchFormState state,
    PropertySearchFormController controller,
  ) async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final initial = state.checkIn ?? today.add(const Duration(days: 1));
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(today) ? today : initial,
      firstDate: today,
      lastDate: DateTime(today.year + 2, 12, 31),
    );
    if (picked != null) {
      var nextOut = state.checkOut;
      if (nextOut == null || !nextOut.isAfter(picked)) {
        nextOut = picked.add(const Duration(days: 2));
      }
      controller.setDates(checkIn: picked, checkOut: nextOut);
    }
  }

  Future<void> _pickCheckOut(
    BuildContext context,
    PropertySearchFormState state,
    PropertySearchFormController controller,
  ) async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final checkIn = state.checkIn ?? today;
    final minOut = checkIn.add(const Duration(days: 1));
    final initial =
        (state.checkOut != null && state.checkOut!.isAfter(checkIn))
            ? state.checkOut!
            : minOut;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(minOut) ? minOut : initial,
      firstDate: minOut,
      lastDate: DateTime(today.year + 2, 12, 31),
    );
    if (picked != null) {
      controller.setDates(checkIn: checkIn, checkOut: picked);
    }
  }

  Future<void> _pickMoveIn(
    BuildContext context,
    PropertySearchFormState state,
    PropertySearchFormController controller,
  ) async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final initial = state.moveInDate ?? today.add(const Duration(days: 14));
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(today) ? today : initial,
      firstDate: today,
      lastDate: DateTime(today.year + 2, 12, 31),
    );
    if (picked != null) {
      controller.setMoveInDate(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final formState = ref.watch(propertySearchFormProvider(widget.propertyType));
    final controller =
        ref.read(propertySearchFormProvider(widget.propertyType).notifier);
    final isShortStay = formState.mode == RentalMode.shortStay;
    final fmt = DateFormat('MMM d, yyyy');

    if (_locationController.text != formState.location) {
      _locationController.value = TextEditingValue(
        text: formState.location,
        selection: TextSelection.collapsed(offset: formState.location.length),
      );
    }

    return Scaffold(
      backgroundColor: Tokens.canvas,
      appBar: AppBar(
        backgroundColor: Tokens.canvas,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: Tokens.primaryNavy,
          ),
          onPressed: () => context.pop(),
        ),
        centerTitle: true,
        title: Text(
          widget.propertyType.label,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Tokens.primaryNavy,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                physics: Tokens.scroll,
                padding: const EdgeInsets.symmetric(
                  horizontal: Tokens.gutter,
                  vertical: Tokens.s12,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Where do you want to stay?',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Tokens.primaryNavy,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Tokens.hairline),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x05000000),
                            blurRadius: 6,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.location_on_outlined,
                            size: 20,
                            color: Tokens.primaryNavy,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _locationController,
                              onChanged: controller.setLocation,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Tokens.ink,
                              ),
                              decoration: const InputDecoration(
                                isDense: true,
                                filled: false,
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                                hintText: 'Search location / Cebu City',
                                hintStyle: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w400,
                                  color: Tokens.muted,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    SearchModeToggle(
                      selectedMode: formState.mode,
                      onChanged: controller.setMode,
                    ),
                    const SizedBox(height: 14),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      switchInCurve: Curves.easeOut,
                      switchOutCurve: Curves.easeIn,
                      transitionBuilder: (child, animation) =>
                          FadeTransition(opacity: animation, child: child),
                      child: isShortStay
                          ? Container(
                              key: const ValueKey('short_stay_slots'),
                              height: 60,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Tokens.hairline),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x05000000),
                                    blurRadius: 6,
                                    offset: Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: _SearchConfigSlot(
                                      icon: Icons.calendar_today_outlined,
                                      label: 'Check in',
                                      value: formState.checkIn == null
                                          ? 'Select date'
                                          : fmt.format(formState.checkIn!),
                                      onTap: () => _pickCheckIn(
                                        context,
                                        formState,
                                        controller,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    width: 1,
                                    height: 28,
                                    color: Tokens.hairline,
                                  ),
                                  Expanded(
                                    child: _SearchConfigSlot(
                                      icon: Icons.calendar_today_outlined,
                                      label: 'Check out',
                                      value: formState.checkOut == null
                                          ? 'Select date'
                                          : fmt.format(formState.checkOut!),
                                      onTap: () => _pickCheckOut(
                                        context,
                                        formState,
                                        controller,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    width: 1,
                                    height: 28,
                                    color: Tokens.hairline,
                                  ),
                                  Expanded(
                                    child: _SearchConfigSlot(
                                      icon: Icons.people_outline_rounded,
                                      label: 'Guests',
                                      value: '${formState.guests}',
                                      hasChevron: true,
                                      onTap: () => OccupantsSheet.show(
                                        context,
                                        title: 'Guests',
                                        label: 'Number of guests',
                                        initialCount: formState.guests,
                                        onSaved: controller.setGuests,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : Container(
                              key: const ValueKey('monthly_slots'),
                              height: 60,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Tokens.hairline),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x05000000),
                                    blurRadius: 6,
                                    offset: Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: _SearchConfigSlot(
                                      icon: Icons.calendar_today_outlined,
                                      label: 'Move in',
                                      value: formState.moveInDate == null
                                          ? 'Select date'
                                          : fmt.format(formState.moveInDate!),
                                      onTap: () => _pickMoveIn(
                                        context,
                                        formState,
                                        controller,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    width: 1,
                                    height: 28,
                                    color: Tokens.hairline,
                                  ),
                                  Expanded(
                                    child: _SearchConfigSlot(
                                      icon: Icons.access_time_rounded,
                                      label: 'Lease duration',
                                      value: formState.leaseDuration.label,
                                      hasChevron: true,
                                      onTap: () => LeaseDurationSheet.show(
                                        context,
                                        selected: formState.leaseDuration,
                                        onSelected:
                                            controller.setLeaseDuration,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    width: 1,
                                    height: 28,
                                    color: Tokens.hairline,
                                  ),
                                  Expanded(
                                    child: _SearchConfigSlot(
                                      icon: Icons.people_outline_rounded,
                                      label: 'Occupants',
                                      value: '${formState.occupants}',
                                      hasChevron: true,
                                      onTap: () => OccupantsSheet.show(
                                        context,
                                        title: 'Occupants',
                                        label: 'Number of occupants',
                                        initialCount: formState.occupants,
                                        onSaved: controller.setOccupants,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                    ),
                    if (formState.validationError != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: const Color(0xFFFCA5A5),
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline_rounded,
                              size: 18,
                              color: Color(0xFFDC2626),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                formState.validationError!,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFFDC2626),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(Tokens.gutter),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: Tokens.primaryNavy,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    final criteria = controller.submit();
                    if (criteria != null) {
                      context.push(Routes.propertyResults, extra: criteria);
                    }
                  },
                  child: Text(
                    widget.propertyType.searchCtaLabel,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchConfigSlot extends StatelessWidget {
  const _SearchConfigSlot({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
    this.hasChevron = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;
  final bool hasChevron;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Row(
          children: [
            Icon(icon, size: 15, color: Tokens.primaryNavy),
            const SizedBox(width: 5),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: Tokens.muted,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: Tokens.primaryNavy,
                      letterSpacing: -0.1,
                    ),
                  ),
                ],
              ),
            ),
            if (hasChevron)
              const Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 14,
                color: Tokens.muted,
              ),
          ],
        ),
      ),
    );
  }
}
