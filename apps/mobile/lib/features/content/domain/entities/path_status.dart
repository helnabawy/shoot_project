/// What `GET resolve` says about a site path (`resolveV1.status`). The content screens use it only
/// after a read answered 404, to tell a removed page (screen 38) from an unknown one (screen 37).
enum PathStatus {
  page('page'),
  removed('removed'),
  notFound('notFound');

  const PathStatus(this.wire);

  final String wire;

  /// A status this build does not know reads as [notFound].
  static PathStatus fromWire(String value) {
    for (final status in values) {
      if (status.wire == value) return status;
    }
    return notFound;
  }
}
