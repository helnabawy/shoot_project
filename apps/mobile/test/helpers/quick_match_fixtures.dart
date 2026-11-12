import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/features/quick_match/data/models/quick_match_models.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/domain/repositories/quick_match_repository.dart';

import 'api_examples.dart';

class MockQuickMatchRepository extends Mock implements QuickMatchRepository {}

/// Step 2 with three creators free (`match.json`).
MatchPage exampleMatch() =>
    MatchPageModel.fromJson(loadExample('match')).toEntity();

/// Step 2 with nobody free and three other days (`match-none-free.json`).
MatchPage exampleNoneFree() =>
    MatchPageModel.fromJson(loadExample('match-none-free')).toEntity();

BookingView exampleView(String name) =>
    BookingViewModel.fromJson(loadExample('booking-view-$name')).toEntity();

QuotationIssued exampleIssued() =>
    QuotationIssuedModel.fromJson(loadExample('quotation-issued')).toEntity();

const exampleRef = 'B-7K2M9';
const exampleKey = 'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk';
