import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

import '../../helpers/api_examples.dart';

/// The shared examples' image: the wordmark logo in `site.json`.
Json _logo() => readObject(loadExample('site'), 'logo');

void main() {
  group('ImageRefModel.fromJson', () {
    test('decodes imageV1', () {
      final image = ImageRefModel.fromJson(_logo()).toEntity();

      expect(image.alt, 'Shoot');
      expect(image.width, 480);
      expect(image.height, 120);
      expect(image.sizes.map((s) => s.width), [240, 480]);
      expect(
        image.sizes.first,
        const ImageSize(
          url: 'https://shoot.example/api/media/file/wordmark-en-240.webp',
          width: 240,
          height: 60,
        ),
      );
      expect(image.aspectRatio, 4);
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
      final json = _logo();

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
    final image = ImageRefModel.fromJson(_logo()).toEntity();

    test('120 px at 1x, 2x and 3x picks the smallest size that covers it', () {
      expect(image.pick(120 * 1).width, 240);
      expect(image.pick(120 * 2).width, 240);
      expect(image.pick(120 * 3).width, 480);
    });

    test('a target between sizes picks the next larger size', () {
      expect(image.pick(240).width, 240);
      expect(image.pick(241).width, 480);
    });

    test('a larger target than any size picks the largest', () {
      expect(image.pick(5000).width, 480);
    });
  });
}
