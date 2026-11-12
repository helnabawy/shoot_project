import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';

import '../../helpers/pump_app.dart';

/// A stand-in for the network: records each address and answers with
/// [respond]. Nothing leaves the test.
class _FakeHttpClient implements HttpClient {
  _FakeHttpClient(this.respond);

  final Future<HttpClientRequest> Function(Uri url) respond;
  final List<Uri> requested = [];

  @override
  bool autoUncompress = true;

  @override
  Future<HttpClientRequest> getUrl(Uri url) {
    requested.add(url);
    return respond(url);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FailingRequest implements HttpClientRequest {
  @override
  Future<HttpClientResponse> close() async => _NotFoundResponse();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _NotFoundResponse implements HttpClientResponse {
  @override
  int get statusCode => HttpStatus.notFound;

  @override
  Future<E> drain<E>([E? futureValue]) async => futureValue as E;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Never answers: the image stays loading.
Future<HttpClientRequest> _pending(Uri _) =>
    Completer<HttpClientRequest>().future;

Future<HttpClientRequest> _failing(Uri _) async => _FailingRequest();

int _seq = 0;

/// Omar's photo in the three stored sizes, at a fresh address per test so the
/// image cache never answers for the network.
ImageRef _photo({String alt = 'Omar K.'}) {
  final id = _seq++;
  return ImageRef(
    alt: alt,
    width: 1600,
    height: 2000,
    sizes: [
      for (final w in [400, 800, 1600])
        ImageSize(
          url: 'https://example.test/api/media/file/omar-$id-$w.webp',
          width: w,
          height: w * 5 ~/ 4,
        ),
    ],
  );
}

void main() {
  late _FakeHttpClient client;

  Future<void> pump(
    WidgetTester tester,
    Widget child, {
    double dpr = 2,
    Future<HttpClientRequest> Function(Uri url) respond = _pending,
  }) async {
    client = _FakeHttpClient(respond);
    debugNetworkImageHttpClientProvider = () => client;
    tester.view.devicePixelRatio = dpr;
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpApp(Scaffold(body: Center(child: child)));
  }

  /// Every test ends here, so the painting debug variable is unset before
  /// the binding checks it.
  void done() => debugNetworkImageHttpClientProvider = null;

  ResizeImage provider(WidgetTester tester) =>
      tester.widget<Image>(find.byType(Image)).image as ResizeImage;

  group('MR-US3-S5 the size it requests', () {
    for (final dpr in [2.0, 3.0]) {
      testWidgets('at width 120 and DPR $dpr it asks for the 400 size', (
        tester,
      ) async {
        final photo = _photo();
        await pump(
          tester,
          ShootImage(photo, width: 120, height: 150),
          dpr: dpr,
        );

        expect(client.requested.single.toString(), photo.sizes[0].url);
        expect(provider(tester).width, (120 * dpr).ceil());
        done();
      });
    }

    testWidgets('at width 700 and DPR 3 it asks for the 1600 size', (
      tester,
    ) async {
      final photo = _photo();
      await pump(tester, ShootImage(photo, width: 700, height: 300), dpr: 3);

      expect(client.requested.single.toString(), photo.sizes[2].url);
      expect(provider(tester).width, 1600);
      done();
    });

    testWidgets('without a width it uses the width it is laid out at', (
      tester,
    ) async {
      final photo = _photo();
      await pump(
        tester,
        SizedBox(width: 300, height: 200, child: ShootImage(photo)),
      );

      expect(client.requested.single.toString(), photo.sizes[1].url);
      expect(provider(tester).width, 600);
      done();
    });
  });

  group('MR-US3-S6 the scene tile in place of a photo', () {
    testWidgets('image null renders the scene tile, with no request', (
      tester,
    ) async {
      await pump(
        tester,
        const ShootImage(null, width: 120, height: 150, sceneIndex: 2),
      );

      expect(tester.widget<SceneTile>(find.byType(SceneTile)).variant, 2);
      expect(find.byType(Image), findsNothing);
      expect(client.requested, isEmpty);
      done();
    });

    testWidgets('while loading the scene tile shows', (tester) async {
      await pump(tester, ShootImage(_photo(), width: 120, height: 150));

      expect(find.byType(SceneTile), findsOneWidget);
      expect(find.byType(RawImage), findsNothing);
      done();
    });

    testWidgets('a failing load renders the scene tile', (tester) async {
      await pump(
        tester,
        ShootImage(_photo(), width: 120, height: 150),
        respond: _failing,
      );
      await tester.pump();
      await tester.pump();

      expect(client.requested, hasLength(1));
      expect(find.byType(SceneTile), findsOneWidget);
      expect(find.byType(RawImage), findsNothing);
      expect(tester.takeException(), isNull);
      done();
    });

    testWidgets('the semantics label is the alt text', (tester) async {
      final semantics = tester.ensureSemantics();
      await pump(tester, ShootImage(_photo(), width: 120, height: 150));

      expect(
        tester.getSemantics(find.byType(ShootImage)),
        matchesSemantics(label: 'Omar K.', isImage: true),
      );
      semantics.dispose();
      done();
    });

    testWidgets('an empty alt is left out of semantics', (tester) async {
      final semantics = tester.ensureSemantics();
      await pump(tester, ShootImage(_photo(alt: ''), width: 120, height: 150));

      final marks = find.descendant(
        of: find.byType(ShootImage),
        matching: find.byWidgetPredicate(
          (w) => w is Semantics && w.properties.image == true,
        ),
      );
      expect(marks, findsNothing);
      expect(
        tester
            .widget<ExcludeSemantics>(
              find
                  .descendant(
                    of: find.byType(ShootImage),
                    matching: find.byType(ExcludeSemantics),
                  )
                  .first,
            )
            .excluding,
        isTrue,
      );
      semantics.dispose();
      done();
    });
  });
}
