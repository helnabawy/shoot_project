import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/features/content/presentation/content_deps.dart';
import 'package:shoot_mobile/features/content/presentation/cubit/content_state.dart';
import 'package:shoot_mobile/features/content/presentation/pages/removed_page.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_header.dart';

/// Reads one thing with [loader] and draws it with [builder]; draws screen 38 for a removed thing,
/// 37 for a missing one and 39 (with "Try again") for a failed read. It reads again when [loadKey]
/// changes (a new address) and when the app's language changes, and never keeps an answer (FR-024).
class ContentScreen<T> extends StatefulWidget {
  const ContentScreen({
    super.key,
    required this.loadKey,
    required this.loader,
    required this.builder,
    this.onLoaded,
  });

  /// Identifies what is being read; a change starts a new read.
  final String loadKey;
  final ContentLoader<T> loader;
  final Widget Function(BuildContext context, T value) builder;

  /// Called once each time a read finishes with a value.
  final void Function(BuildContext context, T value)? onLoaded;

  @override
  State<ContentScreen<T>> createState() => _ContentScreenState<T>();
}

class _ContentScreenState<T> extends State<ContentScreen<T>> {
  final ContentCubit<T> _cubit = ContentCubit<T>();
  Locale? _locale;

  @override
  void initState() {
    super.initState();
    unawaited(_cubit.load(widget.loader));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final locale = Localizations.localeOf(context);
    if (_locale != null && _locale != locale) unawaited(_cubit.reload());
    _locale = locale;
  }

  @override
  void didUpdateWidget(ContentScreen<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.loadKey != widget.loadKey) {
      unawaited(_cubit.load(widget.loader));
    }
  }

  @override
  void dispose() {
    unawaited(_cubit.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ContentCubit<T>, ContentState<T>>(
      bloc: _cubit,
      listenWhen: (_, next) => next is ContentLoaded<T>,
      listener: (context, state) {
        if (state is ContentLoaded<T>) {
          widget.onLoaded?.call(context, state.value);
        }
      },
      builder: (context, state) => switch (state) {
        ContentLoading() => const _Loading(),
        ContentLoaded(:final value) => widget.builder(context, value),
        ContentMissing(removed: true) => RemovedPage(
          onWhatsapp: () =>
              unawaited(context.read<ContentDeps>().openWhatsapp()),
        ),
        ContentMissing() => const NotFoundPage(),
        ContentFailed() => ErrorPage(onRetry: () => unawaited(_cubit.reload())),
      },
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) {
    return const ShootScaffold(
      child: Column(
        children: [
          ContentHeader(),
          Expanded(
            child: Center(
              child: SizedBox.square(
                dimension: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
