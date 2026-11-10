import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';
import 'package:shoot_mobile/features/service_health/domain/usecases/check_service_health.dart';

part 'service_health_state.dart';

/// Presentation state for the service-health screen. Talks to the use case
/// only; knows nothing about HTTP or JSON.
class ServiceHealthCubit extends Cubit<ServiceHealthState> {
  ServiceHealthCubit(this._checkServiceHealth)
    : super(const ServiceHealthInitial());

  final CheckServiceHealth _checkServiceHealth;

  Future<void> check() async {
    emit(const ServiceHealthLoading());
    final result = await _checkServiceHealth(const NoParams());
    if (isClosed) return;
    emit(switch (result) {
      Ok(:final value) => ServiceHealthLoaded(value),
      Err(:final failure) => ServiceHealthFailed(failure),
    });
  }
}
