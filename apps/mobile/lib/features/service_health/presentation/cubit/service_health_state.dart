part of 'service_health_cubit.dart';

sealed class ServiceHealthState extends Equatable {
  const ServiceHealthState();

  @override
  List<Object?> get props => [];
}

final class ServiceHealthInitial extends ServiceHealthState {
  const ServiceHealthInitial();
}

final class ServiceHealthLoading extends ServiceHealthState {
  const ServiceHealthLoading();
}

final class ServiceHealthLoaded extends ServiceHealthState {
  const ServiceHealthLoaded(this.health);

  final ServiceHealth health;

  @override
  List<Object?> get props => [health];
}

final class ServiceHealthFailed extends ServiceHealthState {
  const ServiceHealthFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}
