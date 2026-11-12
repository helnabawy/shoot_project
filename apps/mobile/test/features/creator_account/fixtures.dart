import 'dart:typed_data';

import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/features/creator_account/data/models/creator_account_models.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';

import '../../helpers/api_examples.dart';

class MockCreatorAccountRepository extends Mock
    implements CreatorAccountRepository {}

/// Hands back the file it is given, or throws [PickDenied].
final class FakeFilePicker implements FilePicker {
  FakeFilePicker({this.file, this.denied = false});

  PickedFile? file;
  bool denied;

  @override
  Future<PickedFile?> pick(PickSource source) async {
    if (denied) throw const PickDenied();
    return file;
  }
}

PickedFile pickedFile({
  String type = 'image/jpeg',
  int size = 16,
  String name = 'a.jpg',
}) => PickedFile(name: name, contentType: type, bytes: Uint8List(size));

MyProfile profileExample(String name) =>
    MyProfileModel.fromJson(loadExample(name)).toEntity();

CreatorBookings bookingsExample([String name = 'creator-bookings']) =>
    CreatorBookingsModel.fromJson(loadExample(name)).toEntity();

Availability availabilityExample() =>
    AvailabilityModel.fromJson(loadExample('creator-availability')).toEntity();

CreatorAccount accountExample() =>
    CreatorAccountModel.fromJson(loadExample('creator-account')).toEntity();
