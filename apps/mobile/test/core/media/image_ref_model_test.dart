import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';

import '../../helpers/api_fixture.dart';

void main() {
  group('ImageRefModel.fromJson', () {
    test('decodes imageV1', () {
      final image = ImageRefModel.fromJson(apiFixture('image')).toEntity();

      expect(image.alt, 'A wedding portrait in the late afternoon');
      expect(image.width, 2400);
      expect(image.height, 1600);
      expect(image.sizes.map((s) => s.width), [400, 800, 1600]);
      expect(
        image.sizes.first,
        const ImageSize(
          url: 'http://localhost:3000/api/media/file/portrait-400x267.jpg',
          width: 400,
          height: 267,
        ),
      );
      expect(image.aspectRatio, 1.5);
    });

    test('sorts sizes by width and ignores unknown keys', () {
      final image = ImageRefModel.fromJson({
        'alt': '',
        'width': 800,
        'height': 800,
        'focalPoint': 'centre',
        'sizes': [
          {'url': 'https://cdn.test/b.jpg', 'width': 800, 'height': 800},
          {'url': 'https://cdn.test/a.jpg', 'width': 400, 'height': 400},
        ],
      }).toEntity();

      expect(image.sizes.map((s) => s.url), [
        'https://cdn.test/a.jpg',
        'https://cdn.test/b.jpg',
      ]);
    });

    test('throws FormatException on a missing field or no sizes', () {
      final json = apiFixture('image');

      expect(
        () => ImageRefModel.fromJson({...json}..remove('alt')),
        throwsA(isA<FormatException>()),
      );
      expect(
        () => ImageRefModel.fromJson({...json, 'sizes': <Object?>[]}),
        throwsA(isA<FormatException>()),
      );
      expect(
        () => ImageRefModel.fromJson({
          ...json,
          'sizes': [
            {'url': 'x', 'width': '400', 'height': 1},
          ],
        }),
        throwsA(isA<FormatException>()),
      );
    });
  });

  group('ImageRef.pick', () {
    final image = ImageRefModel.fromJson(apiFixture('image')).toEntity();

    test('120 px at 1x, 2x and 3x picks the smallest size that covers it', () {
      expect(image.pick(120 * 1).width, 400);
      expect(image.pick(120 * 2).width, 400);
      expect(image.pick(120 * 3).width, 400);
    });

    test('a target between sizes picks the next larger size', () {
      expect(image.pick(400).width, 400);
      expect(image.pick(401).width, 800);
      expect(image.pick(1200).width, 1600);
    });

    test('a larger target than any size picks the largest', () {
      expect(image.pick(5000).width, 1600);
    });
  });
}
