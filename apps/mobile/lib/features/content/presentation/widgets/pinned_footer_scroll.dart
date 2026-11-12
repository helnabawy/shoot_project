import 'package:flutter/widgets.dart';

/// A scroll view whose [footer] sits at the bottom of the screen when the content is short (the
/// board's `margin-top: auto`) and follows the content when it is long.
class PinnedFooterScroll extends StatelessWidget {
  const PinnedFooterScroll({
    super.key,
    required this.children,
    this.footer,
    this.controller,
  });

  final List<Widget> children;
  final Widget? footer;
  final ScrollController? controller;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        controller: controller,
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: IntrinsicHeight(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ...children,
                if (footer != null) ...[const Spacer(), footer!],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
