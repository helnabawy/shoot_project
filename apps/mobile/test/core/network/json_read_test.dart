import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

enum _Kind { page, guide, unknown }

final _throwsFormat = throwsA(isA<FormatException>());

void main() {
  final json = <String, Object?>{
    'name': 'Shoot',
    'none': null,
    'count': 3,
    'whole': 4.0,
    'half': 4.5,
    'on': true,
    'list': ['a', 'b'],
    'object': {'x': 1},
    'kind': 'guide',
    'future': 'podcast',
  };

  group('readString', () {
    test('reads a string', () => expect(readString(json, 'name'), 'Shoot'));
    test(
      'throws on missing',
      () => expect(() => readString(json, 'x'), _throwsFormat),
    );
    test(
      'throws on null',
      () => expect(() => readString(json, 'none'), _throwsFormat),
    );
    test(
      'throws on mistyped',
      () => expect(() => readString(json, 'count'), _throwsFormat),
    );
  });

  group('readNullableString', () {
    test(
      'reads a string',
      () => expect(readNullableString(json, 'name'), 'Shoot'),
    );
    test(
      'null stays null',
      () => expect(readNullableString(json, 'none'), isNull),
    );
    test(
      'missing is null',
      () => expect(readNullableString(json, 'x'), isNull),
    );
    test('throws on mistyped', () {
      expect(() => readNullableString(json, 'on'), _throwsFormat);
    });
  });

  group('readInt', () {
    test('reads an int', () => expect(readInt(json, 'count'), 3));
    test('reads a whole double', () => expect(readInt(json, 'whole'), 4));
    test(
      'throws on a fraction',
      () => expect(() => readInt(json, 'half'), _throwsFormat),
    );
    test(
      'throws on missing',
      () => expect(() => readInt(json, 'x'), _throwsFormat),
    );
    test(
      'throws on mistyped',
      () => expect(() => readInt(json, 'name'), _throwsFormat),
    );
  });

  group('readBool', () {
    test('reads a bool', () => expect(readBool(json, 'on'), isTrue));
    test(
      'throws on missing',
      () => expect(() => readBool(json, 'x'), _throwsFormat),
    );
    test(
      'throws on mistyped',
      () => expect(() => readBool(json, 'count'), _throwsFormat),
    );
  });

  group('readList', () {
    test('maps each item', () {
      expect(
        readList(json, 'list', (item) => (item! as String).toUpperCase()),
        ['A', 'B'],
      );
    });
    test('throws on missing', () {
      expect(() => readList(json, 'x', (item) => item), _throwsFormat);
    });
    test('throws on mistyped', () {
      expect(() => readList(json, 'name', (item) => item), _throwsFormat);
    });
  });

  group('readObject', () {
    test('reads an object', () => expect(readObject(json, 'object'), {'x': 1}));
    test(
      'throws on missing',
      () => expect(() => readObject(json, 'x'), _throwsFormat),
    );
    test(
      'throws on mistyped',
      () => expect(() => readObject(json, 'list'), _throwsFormat),
    );
  });

  group('readNullableObject', () {
    test(
      'reads an object',
      () => expect(readNullableObject(json, 'object'), {'x': 1}),
    );
    test(
      'null stays null',
      () => expect(readNullableObject(json, 'none'), isNull),
    );
    test(
      'missing is null',
      () => expect(readNullableObject(json, 'x'), isNull),
    );
    test('throws on mistyped', () {
      expect(() => readNullableObject(json, 'name'), _throwsFormat);
    });
  });

  group('asObject', () {
    test('casts a map item', () => expect(asObject({'a': 1}), {'a': 1}));
    test(
      'throws on anything else',
      () => expect(() => asObject('a'), _throwsFormat),
    );
  });

  group('readEnum', () {
    test('maps a known value', () {
      expect(readEnum(json, 'kind', _Kind.values, _Kind.unknown), _Kind.guide);
    });
    test('maps an unknown value to the fallback', () {
      expect(
        readEnum(json, 'future', _Kind.values, _Kind.unknown),
        _Kind.unknown,
      );
    });
    test('throws on missing', () {
      expect(
        () => readEnum(json, 'x', _Kind.values, _Kind.unknown),
        _throwsFormat,
      );
    });
    test('throws on mistyped', () {
      expect(
        () => readEnum(json, 'count', _Kind.values, _Kind.unknown),
        _throwsFormat,
      );
    });
  });

  group('readNullableInt', () {
    test('reads an integer, null or absent', () {
      expect(readNullableInt(json, 'count'), 3);
      expect(readNullableInt(json, 'none'), isNull);
      expect(readNullableInt(json, 'x'), isNull);
    });
    test(
      'throws on mistyped',
      () => expect(() => readNullableInt(json, 'half'), _throwsFormat),
    );
  });

  group('readNullableNum', () {
    test('reads a number, null or absent', () {
      expect(readNullableNum(json, 'half'), 4.5);
      expect(readNullableNum(json, 'count'), 3);
      expect(readNullableNum(json, 'none'), isNull);
      expect(readNullableNum(json, 'x'), isNull);
    });
    test(
      'throws on mistyped',
      () => expect(() => readNullableNum(json, 'name'), _throwsFormat),
    );
  });

  group('readStringList', () {
    test('reads a list of strings', () {
      expect(readStringList(json, 'list'), ['a', 'b']);
    });
    test('throws on a non-string item or a non-list', () {
      expect(
        () => readStringList({
          'mixed': ['a', 1],
        }, 'mixed'),
        _throwsFormat,
      );
      expect(() => readStringList(json, 'name'), _throwsFormat);
    });
  });

  test('the message names the field', () {
    expect(
      () => readString(json, 'missing'),
      throwsA(
        isA<FormatException>().having(
          (e) => e.message,
          'message',
          contains('missing'),
        ),
      ),
    );
  });
}
