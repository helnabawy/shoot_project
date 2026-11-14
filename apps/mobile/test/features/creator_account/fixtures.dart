import 'dart:typed_data';

import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/features/creator_account/data/models/creator_account_models.dart';
import 'package:shoot_mobile/features/creator_account/data/models/inbox_models.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/inbox_repository.dart';

import '../../helpers/api_examples.dart';

class MockCreatorAccountRepository extends Mock
    implements CreatorAccountRepository {}

class MockInboxRepository extends Mock implements InboxRepository {}

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

/// 019: a live creator's account with open briefs.
CreatorAccount accountWithBriefsExample() =>
    CreatorAccountModel.fromJson(loadExample('creator-account-briefs'))
        .toEntity();

CreatorInbox inboxExample([String name = 'creator-briefs']) =>
    CreatorInboxModel.fromJson(loadExample(name)).toEntity();

CreatorAccount withWaiting(CreatorAccount a, BookingRequest waiting) =>
    CreatorAccount(
      name: a.name,
      code: a.code,
      professions: a.professions,
      status: a.status,
      strength: a.strength,
      needs: a.needs,
      waiting: waiting,
      deliverable: a.deliverable,
      waitingCount: 1,
      upcomingCount: a.upcomingCount,
      blockedDays: a.blockedDays,
      briefs: a.briefs,
    );

CreatorAccount withBriefs(CreatorAccount a, BriefsSummary? briefs) =>
    CreatorAccount(
      name: a.name,
      code: a.code,
      professions: a.professions,
      status: a.status,
      strength: a.strength,
      needs: a.needs,
      waiting: a.waiting,
      deliverable: a.deliverable,
      waitingCount: a.waitingCount,
      upcomingCount: a.upcomingCount,
      blockedDays: a.blockedDays,
      briefs: briefs,
    );
