import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/listing_repository.dart';
import '../../data/viewing_repository.dart';
import '../../design/motion.dart';
import '../../design/tokens.dart';
import 'request_viewing_controller.dart';
import 'widgets/assigned_agent_card.dart';
import 'widgets/matching_progress.dart';
import 'widgets/viewing_animation.dart';
import 'widgets/viewing_buttons.dart';
import 'widgets/viewing_day_strip.dart';
import 'widgets/viewing_icon.dart';
import 'widgets/viewing_property_card.dart';
import 'widgets/viewing_time_window_picker.dart';
import 'widgets/viewing_timeline.dart';

enum _Surface { form, progress, outcome }

_Surface _surfaceOf(RequestViewingState state) => switch (state.ui) {
      RequestViewingUiState.form => _Surface.form,
      RequestViewingUiState.pendingConfirmation || RequestViewingUiState.confirmed => _Surface.outcome,
      RequestViewingUiState.failure => state.result != null ? _Surface.outcome : _Surface.progress,
      _ => _Surface.progress,
    };

class RequestViewingScreen extends ConsumerStatefulWidget {
  const RequestViewingScreen({required this.listingId, this.rescheduleId, this.viewingId, super.key});

  final String listingId;
  final String? rescheduleId;
  final String? viewingId;

  @override
  ConsumerState<RequestViewingScreen> createState() => _RequestViewingScreenState();
}

class _RequestViewingScreenState extends ConsumerState<RequestViewingScreen> with WidgetsBindingObserver {
  late final ViewingRequestKey _key = (listingId: widget.listingId, rescheduleId: widget.rescheduleId);

  RequestViewingController get _controller => ref.read(requestViewingControllerProvider(_key).notifier);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final viewingId = widget.viewingId;
    if (viewingId != null) WidgetsBinding.instance.addPostFrameCallback((_) => _controller.track(viewingId));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _controller.reconcile();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(requestViewingControllerProvider(_key));
    final card = ref.watch(listingDetailProvider(widget.listingId)).valueOrNull?.card;
    final surface = _surfaceOf(state);
    final rescheduling = widget.rescheduleId != null;

    final Widget body = switch (surface) {
      _Surface.form => _RequestForm(
          key: const ValueKey(_Surface.form),
          state: state,
          controller: _controller,
          rescheduling: rescheduling,
          title: card?.title ?? '',
          place: card?.place ?? '',
          photo: card == null || card.photos.isEmpty ? null : card.photos.first,
        ),
      _Surface.progress => _MatchingView(
          key: const ValueKey(_Surface.progress),
          state: state,
          onRetry: _controller.retry,
          onEdit: widget.viewingId == null ? _controller.editAgain : null,
        ),
      _Surface.outcome => _OutcomeView(
          key: const ValueKey(_Surface.outcome),
          state: state,
          onMessage: () => context.push(Routes.conversation(state.result!.viewing.conversationId)),
          onMyRequests: () => context.push(Routes.activity),
          onAcceptSuggestion: _controller.acceptSuggestion,
          onChooseAnotherTime: () => context.pushReplacement(
            '${Routes.viewing(widget.listingId)}?reschedule=${state.result!.viewing.id}',
          ),
        ),
    };

    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _TopBar(closing: surface == _Surface.outcome),
            Expanded(
              child: AnimatedSwitcher(
                duration: Motion.of(context, Motion.state),
                switchInCurve: Motion.enter,
                switchOutCurve: Motion.swap,
                transitionBuilder: (child, animation) => FadeTransition(
                  opacity: animation,
                  child: SlideTransition(
                    position: Tween<Offset>(begin: const Offset(0, 0.015), end: Offset.zero).animate(animation),
                    child: child,
                  ),
                ),
                child: body,
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: surface == _Surface.form && state.days.isNotEmpty
          ? SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s12),
                child: ViewingPrimaryButton(
                  label: rescheduling ? 'Send new time' : 'Send viewing request',
                  glyph: ViewingGlyph.calendar,
                  onPressed: state.canSubmit
                      ? () {
                          HapticFeedback.lightImpact();
                          _controller.submit();
                        }
                      : null,
                ),
              ),
            )
          : null,
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.closing});

  final bool closing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Tokens.s4),
      child: SizedBox(
        height: Tokens.tap + Tokens.s4,
        child: Align(
          alignment: Alignment.centerLeft,
          child: Semantics(
            button: true,
            label: closing ? 'Close' : 'Back',
            excludeSemantics: true,
            child: InkResponse(
              onTap: () => Navigator.of(context).maybePop(),
              radius: Tokens.tap / 2,
              child: SizedBox.square(
                dimension: Tokens.tap,
                child: Center(
                  child: AnimatedSwitcher(
                    duration: Motion.of(context, Motion.selection),
                    child: ViewingIcon(
                      closing ? ViewingGlyph.close : ViewingGlyph.chevronLeft,
                      key: ValueKey(closing),
                      size: 22,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: Tokens.s20, bottom: Tokens.s8),
        child: Semantics(
          header: true,
          child: Text(
            text,
            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: Tokens.primaryNavy),
          ),
        ),
      );
}

class _RequestForm extends StatefulWidget {
  const _RequestForm({
    required this.state,
    required this.controller,
    required this.rescheduling,
    required this.title,
    required this.place,
    required this.photo,
    super.key,
  });

  final RequestViewingState state;
  final RequestViewingController controller;
  final bool rescheduling;
  final String title;
  final String place;
  final String? photo;

  @override
  State<_RequestForm> createState() => _RequestFormState();
}

class _RequestFormState extends State<_RequestForm> {
  late final TextEditingController _note = TextEditingController(text: widget.state.note);

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    if (state.days.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(Tokens.s40),
          child: Text(
            'No viewing dates are open right now. Please check back later.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Tokens.muted),
          ),
        ),
      );
    }
    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s4, Tokens.gutter, Tokens.s24),
      children: [
        if (widget.title.isNotEmpty) ...[
          ViewingPropertyCard(title: widget.title, place: widget.place, photo: widget.photo),
          const SizedBox(height: Tokens.s20),
        ],
        Semantics(
          header: true,
          child: Text(
            widget.rescheduling ? 'Choose a new time' : 'Request a viewing',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.4,
              height: 1.2,
              color: Tokens.primaryNavy,
            ),
          ),
        ),
        const SizedBox(height: Tokens.s6),
        const Text(
          'Choose your preferred date and time. We\u2019ll match you with the best available verified agent after you submit your request.',
          style: TextStyle(fontSize: 13.5, height: 1.45, color: Tokens.muted),
        ),
        const _SectionLabel('Select a date'),
        ViewingDayStrip(days: state.days, selected: state.selectedDay, onSelect: widget.controller.selectDay),
        const _SectionLabel('Preferred time'),
        ViewingTimeWindowPicker(
          day: state.selectedDay,
          now: state.now,
          selected: state.window,
          onSelect: widget.controller.selectWindow,
        ),
        const SizedBox(height: Tokens.s16),
        _NoteField(controller: _note, length: state.note.length, onChanged: widget.controller.updateNote),
      ],
    );
  }
}

class _NoteField extends StatelessWidget {
  const _NoteField({required this.controller, required this.length, required this.onChanged});

  final TextEditingController controller;
  final int length;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(Tokens.s12, Tokens.s12, Tokens.s12, Tokens.s4),
          decoration: BoxDecoration(
            color: Tokens.card,
            borderRadius: BorderRadius.circular(Tokens.rControl),
            border: Border.all(color: Tokens.hairline),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  ViewingIcon(ViewingGlyph.message, size: 16, color: Tokens.muted),
                  SizedBox(width: Tokens.s8),
                  Text(
                    'Add a note (optional)',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500, color: Tokens.primaryNavy),
                  ),
                ],
              ),
              TextField(
                controller: controller,
                onChanged: onChanged,
                minLines: 2,
                maxLines: 3,
                inputFormatters: [LengthLimitingTextInputFormatter(kViewingNoteMaxLength)],
                textCapitalization: TextCapitalization.sentences,
                style: const TextStyle(fontSize: 13.5, height: 1.4, color: Tokens.ink),
                decoration: const InputDecoration(
                  isDense: true,
                  filled: false,
                  hintText: 'e.g. I\u2019d like to view this property this weekend\u2026',
                  hintStyle: TextStyle(fontSize: 13.5, color: Tokens.muted),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.only(top: Tokens.s8, bottom: Tokens.s8),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: Tokens.s4),
        Semantics(
          label: '$length of $kViewingNoteMaxLength characters',
          excludeSemantics: true,
          child: Text('$length/$kViewingNoteMaxLength', style: const TextStyle(fontSize: 11.5, color: Tokens.muted)),
        ),
      ],
    );
  }
}

class _MatchingView extends StatelessWidget {
  const _MatchingView({required this.state, required this.onRetry, required this.onEdit, super.key});

  final RequestViewingState state;
  final VoidCallback onRetry;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final failed = state.ui == RequestViewingUiState.failure;
    final loading = state.ui == RequestViewingUiState.loading;
    final duration = Motion.of(context, Motion.matching);
    final Widget visual = failed
        ? Container(
            key: const ValueKey('failed'),
            width: 96,
            height: 96,
            alignment: Alignment.center,
            decoration: const BoxDecoration(color: Tokens.softBlue, shape: BoxShape.circle),
            child: const ViewingIcon(ViewingGlyph.info, size: 36),
          )
        : loading
            ? const ViewingAnimation(
                key: ValueKey('loading'),
                kind: ViewingMotion.spinner,
                size: 40,
                semanticLabel: 'Loading your viewing request',
              )
            : const ViewingAnimation(
                key: ValueKey('matching'),
                kind: ViewingMotion.matching,
                size: 196,
                semanticLabel: 'Finding an available agent',
              );
    final title = failed
        ? 'We couldn\u2019t complete your viewing request.'
        : loading
            ? 'Loading your request\u2026'
            : 'Finding the best available agent for you\u2026';
    final message = failed
        ? (state.error ?? 'Please check your connection and try again.')
        : 'We\u2019re matching you with a verified agent who can assist with your preferred date and time.';

    return CustomScrollView(
      slivers: [
        SliverFillRemaining(
          hasScrollBody: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Tokens.s24, Tokens.s16, Tokens.s24, Tokens.s16),
            child: Column(
              children: [
                SizedBox(
                  height: 196,
                  child: Center(
                    child: AnimatedSwitcher(
                      duration: duration,
                      switchInCurve: Motion.enter,
                      switchOutCurve: Motion.swap,
                      child: visual,
                    ),
                  ),
                ),
                const SizedBox(height: Tokens.s24),
                AnimatedSwitcher(
                  duration: duration,
                  child: Semantics(
                    key: ValueKey(title),
                    header: true,
                    liveRegion: true,
                    child: Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                        height: 1.3,
                        color: Tokens.primaryNavy,
                      ),
                    ),
                  ),
                ),
                if (!loading) ...[
                  const SizedBox(height: Tokens.s8),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 13.5, height: 1.45, color: Tokens.muted),
                  ),
                ],
                const SizedBox(height: Tokens.s32),
                if (failed) ...[
                  ViewingPrimaryButton(label: 'Try again', onPressed: onRetry),
                  if (onEdit != null) ...[
                    const SizedBox(height: Tokens.s4),
                    TextButton(
                      onPressed: onEdit,
                      style: TextButton.styleFrom(
                        foregroundColor: Tokens.primaryNavy,
                        minimumSize: const Size.fromHeight(Tokens.tap),
                        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      child: const Text('Edit request'),
                    ),
                  ],
                ] else if (!loading)
                  Align(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 300),
                      child: MatchingProgress(state: state),
                    ),
                  ),
                const Spacer(),
                if (!failed && !loading) const _Reassurance(),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Reassurance extends StatelessWidget {
  const _Reassurance();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: Tokens.s24),
      padding: const EdgeInsets.symmetric(horizontal: Tokens.s16, vertical: Tokens.s12),
      decoration: BoxDecoration(color: Tokens.softBlue, borderRadius: BorderRadius.circular(Tokens.rSm)),
      child: const Row(
        children: [
          ViewingIcon(ViewingGlyph.shieldCheck, size: 18),
          SizedBox(width: Tokens.s12),
          Expanded(
            child: Text(
              'You\u2019ll be notified once the viewing is confirmed.',
              style: TextStyle(fontSize: 12.5, height: 1.4, color: Tokens.primaryNavy),
            ),
          ),
        ],
      ),
    );
  }
}

class _OutcomeView extends StatelessWidget {
  const _OutcomeView({
    required this.state,
    required this.onMessage,
    required this.onMyRequests,
    required this.onAcceptSuggestion,
    required this.onChooseAnotherTime,
    super.key,
  });

  final RequestViewingState state;
  final VoidCallback onMessage;
  final VoidCallback onMyRequests;
  final VoidCallback onAcceptSuggestion;
  final VoidCallback onChooseAnotherTime;

  @override
  Widget build(BuildContext context) {
    final request = state.result!;
    final viewing = request.viewing;
    final agent = request.agent;
    final confirmed = viewing.isConfirmed;
    final positive = confirmed || viewing.isActive;
    final duration = Motion.of(context, Motion.state);
    final (title, subtitle) = switch (viewing.status) {
      ViewingStatus.confirmed || ViewingStatus.completed => (
          'Viewing confirmed',
          'Your agent has confirmed the exact date and time.',
        ),
      ViewingStatus.matching => (
          'Viewing request sent',
          'We\u2019re matching you with an available specialist.',
        ),
      ViewingStatus.declined => (
          'No specialist was available',
          'Choose another date or time and we\u2019ll match you again.',
        ),
      ViewingStatus.cancelled => ('Viewing cancelled', viewing.preferredLabel),
      ViewingStatus.rescheduleRequested => ('Your agent suggested another time', viewing.scheduledLabel ?? ''),
      _ => (
          'Viewing request sent',
          agent?.verified ?? false
              ? 'We\u2019ve connected you with a verified agent. They will confirm the exact date and time based on your request.'
              : 'We\u2019ve connected you with an agent. They will confirm the exact date and time based on your request.',
        ),
    };

    return CustomScrollView(
      slivers: [
        SliverFillRemaining(
          hasScrollBody: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: AnimatedSwitcher(
                    duration: duration,
                    switchInCurve: Motion.enter,
                    switchOutCurve: Motion.swap,
                    child: positive
                        ? ViewingAnimation(
                            key: ValueKey(confirmed),
                            kind: ViewingMotion.success,
                            size: 88,
                            tone: confirmed ? Tokens.available : Tokens.primaryNavy,
                          )
                        : Container(
                            key: const ValueKey('inactive'),
                            width: 72,
                            height: 72,
                            margin: const EdgeInsets.all(Tokens.s8),
                            alignment: Alignment.center,
                            decoration: const BoxDecoration(color: Tokens.softBlue, shape: BoxShape.circle),
                            child: const ViewingIcon(ViewingGlyph.calendar, size: 30),
                          ),
                  ),
                ),
                const SizedBox(height: Tokens.s8),
                AnimatedSwitcher(
                  duration: duration,
                  child: Semantics(
                    key: ValueKey(title),
                    header: true,
                    liveRegion: true,
                    child: Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.4,
                        color: Tokens.primaryNavy,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: Tokens.s6),
                AnimatedSwitcher(
                  duration: duration,
                  child: Padding(
                    key: ValueKey(subtitle),
                    padding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
                    child: Text(
                      subtitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13.5, height: 1.45, color: Tokens.muted),
                    ),
                  ),
                ),
                if (viewing.agentChangeNotice != null) ...[
                  const SizedBox(height: Tokens.s12),
                  _Notice(glyph: ViewingGlyph.info, text: viewing.agentChangeNotice!),
                ],
                const SizedBox(height: Tokens.s20),
                if (agent != null) ...[
                  AssignedAgentCard(agent: agent, onMessage: onMessage),
                  const SizedBox(height: Tokens.s12),
                ] else if (viewing.status == ViewingStatus.matching) ...[
                  const _Notice(
                    glyph: ViewingGlyph.info,
                    text:
                        'All specialists for this property are busy right now. We\u2019ll assign one as soon as someone is available.',
                  ),
                  const SizedBox(height: Tokens.s12),
                ],
                _SchedulePanel(viewing: viewing),
                if (viewing.canAcceptSuggestion) ...[
                  const SizedBox(height: Tokens.s12),
                  ViewingPrimaryButton(label: 'Accept ${viewing.scheduledLabel}', onPressed: onAcceptSuggestion),
                ],
                if (viewing.canAcceptSuggestion || viewing.status == ViewingStatus.declined) ...[
                  const SizedBox(height: Tokens.s8),
                  ViewingSecondaryButton(label: 'Choose another time', onPressed: onChooseAnotherTime),
                ],
                const SizedBox(height: Tokens.s20),
                ViewingTimeline(viewing: viewing, now: state.now),
                if (state.error != null) ...[
                  const SizedBox(height: Tokens.s12),
                  Text(state.error!, style: const TextStyle(fontSize: 13, color: Tokens.taken)),
                ],
                const Spacer(),
                const SizedBox(height: Tokens.s24),
                ViewingPrimaryButton(label: 'Open conversation', glyph: ViewingGlyph.message, onPressed: onMessage),
                const SizedBox(height: Tokens.s8),
                ViewingSecondaryButton(
                  label: 'View my requests',
                  glyph: ViewingGlyph.calendar,
                  onPressed: onMyRequests,
                ),
                SizedBox(height: MediaQuery.paddingOf(context).bottom),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SchedulePanel extends StatelessWidget {
  const _SchedulePanel({required this.viewing});

  final ViewingView viewing;

  @override
  Widget build(BuildContext context) {
    final confirmedDay = viewing.confirmedDayLabel;
    final confirmedTime = viewing.confirmedTimeLabel;
    final exact = confirmedDay != null && confirmedTime != null;
    final caption = exact ? 'Confirmed schedule' : 'Requested schedule';
    final day = exact ? confirmedDay : viewing.preferredDayLabel;
    final time = exact ? confirmedTime : viewing.preferredWindowLabel;
    return Semantics(
      container: true,
      label: '$caption, $day, $time',
      excludeSemantics: true,
      child: AnimatedContainer(
        duration: Motion.of(context, Motion.state),
        curve: Motion.enter,
        padding: const EdgeInsets.symmetric(horizontal: Tokens.s16, vertical: Tokens.s12),
        decoration: BoxDecoration(
          color: Tokens.softBlue,
          borderRadius: BorderRadius.circular(Tokens.rControl),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(top: Tokens.s2),
              child: ViewingIcon(ViewingGlyph.calendar, size: 20),
            ),
            const SizedBox(width: Tokens.s12),
            Expanded(
              child: AnimatedSwitcher(
                duration: Motion.of(context, Motion.state),
                layoutBuilder: (current, previous) => Stack(
                  alignment: Alignment.topLeft,
                  children: [...previous, if (current != null) current],
                ),
                child: Column(
                  key: ValueKey('$caption$day$time'),
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(caption, style: const TextStyle(fontSize: 12, color: Tokens.muted)),
                    const SizedBox(height: Tokens.s2),
                    Text(
                      day,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Tokens.primaryNavy),
                    ),
                    const SizedBox(height: Tokens.s2),
                    Text(time, style: const TextStyle(fontSize: 13, color: Tokens.primaryNavy)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.glyph, required this.text});

  final ViewingGlyph glyph;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(Tokens.s12),
        decoration: BoxDecoration(
          color: Tokens.card,
          borderRadius: BorderRadius.circular(Tokens.rSm),
          border: Border.all(color: Tokens.hairline),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ViewingIcon(glyph, size: 18),
            const SizedBox(width: Tokens.s8),
            Expanded(
              child: Text(text, style: const TextStyle(fontSize: 13, color: Tokens.primaryNavy, height: 1.35)),
            ),
          ],
        ),
      );
}
