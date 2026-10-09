import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../app/clock.dart';
import '../../data/api_client.dart';
import '../../data/discovery_repository.dart';
import '../../data/preferences_store.dart';

enum LocationAccess { granted, denied, deniedForever, serviceOff, unavailable }

@immutable
class DevicePosition {
  const DevicePosition({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;
}

@immutable
class LocationOutcome {
  const LocationOutcome(this.access, [this.position]);

  final LocationAccess access;
  final DevicePosition? position;
}

abstract interface class LocationGateway {
  Future<bool> hasPermission();
  Future<LocationOutcome> currentPosition();
  Future<void> openSettings(LocationAccess access);
}

class GeolocatorLocationGateway implements LocationGateway {
  const GeolocatorLocationGateway();

  @override
  Future<bool> hasPermission() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return false;
      final permission = await Geolocator.checkPermission();
      return permission == LocationPermission.always || permission == LocationPermission.whileInUse;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  }

  @override
  Future<LocationOutcome> currentPosition() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return const LocationOutcome(LocationAccess.serviceOff);
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.deniedForever) return const LocationOutcome(LocationAccess.deniedForever);
      if (permission == LocationPermission.denied || permission == LocationPermission.unableToDetermine) {
        return const LocationOutcome(LocationAccess.denied);
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.low, timeLimit: Duration(seconds: 12)),
      );
      return LocationOutcome(
        LocationAccess.granted,
        DevicePosition(latitude: position.latitude, longitude: position.longitude),
      );
    } on MissingPluginException {
      return const LocationOutcome(LocationAccess.unavailable);
    } on PlatformException {
      return const LocationOutcome(LocationAccess.unavailable);
    } on TimeoutException {
      return const LocationOutcome(LocationAccess.unavailable);
    } on LocationServiceDisabledException {
      return const LocationOutcome(LocationAccess.serviceOff);
    } on PermissionDeniedException {
      return const LocationOutcome(LocationAccess.denied);
    }
  }

  @override
  Future<void> openSettings(LocationAccess access) async {
    if (access == LocationAccess.serviceOff) {
      await Geolocator.openLocationSettings();
    } else {
      await Geolocator.openAppSettings();
    }
  }
}

final locationGatewayProvider = Provider<LocationGateway>((ref) => const GeolocatorLocationGateway());

sealed class SearchPlace {
  const SearchPlace();

  String get label;
}

final class AnywherePlace extends SearchPlace {
  const AnywherePlace();

  @override
  String get label => 'Anywhere';

  @override
  bool operator ==(Object other) => other is AnywherePlace;

  @override
  int get hashCode => 0;
}

final class NearMePlace extends SearchPlace {
  const NearMePlace(this.position, {required this.capturedAt, this.cityLabel});

  final DevicePosition position;
  final DateTime capturedAt;
  final String? cityLabel;

  @override
  String get label => cityLabel == null ? 'Near you' : 'Near you · $cityLabel';

  NearMePlace withCity(String? city) => NearMePlace(position, capturedAt: capturedAt, cityLabel: city);

  @override
  bool operator ==(Object other) =>
      other is NearMePlace &&
      other.position.latitude == position.latitude &&
      other.position.longitude == position.longitude &&
      other.cityLabel == cityLabel;

  @override
  int get hashCode => Object.hash(position.latitude, position.longitude, cityLabel);
}

final class AreaPlace extends SearchPlace {
  const AreaPlace(this.cityLabel);

  final String cityLabel;

  @override
  String get label => cityLabel;

  @override
  bool operator ==(Object other) => other is AreaPlace && other.cityLabel == cityLabel;

  @override
  int get hashCode => cityLabel.hashCode;
}

@immutable
class LocationState {
  const LocationState({
    this.place = const AnywherePlace(),
    this.locating = false,
    this.problem,
  });

  final SearchPlace place;
  final bool locating;
  final LocationAccess? problem;

  bool get isNearMe => place is NearMePlace;

  bool get isSpecified => place is! AnywherePlace;

  String? get problemMessage => switch (problem) {
        LocationAccess.denied => 'Location permission was declined. Choose an area instead.',
        LocationAccess.deniedForever => 'Location is off for Westayplace. Turn it on in Settings, or choose an area.',
        LocationAccess.serviceOff => 'Location services are off. Turn them on, or choose an area.',
        LocationAccess.unavailable => 'We couldn’t get your location. Choose an area or try again.',
        _ => null,
      };

  bool get canOpenSettings => problem == LocationAccess.deniedForever || problem == LocationAccess.serviceOff;

  String get discoveryTitle => switch (place) {
        NearMePlace(:final cityLabel) => cityLabel == null ? 'Explore near you' : 'Explore $cityLabel',
        AreaPlace(:final cityLabel) => 'Explore $cityLabel',
        AnywherePlace() => 'Explore places',
      };

  String? get cityContext => switch (place) {
        NearMePlace(:final cityLabel) => cityLabel,
        AreaPlace(:final cityLabel) => cityLabel,
        AnywherePlace() => null,
      };
}

const String kPreferredCityKey = 'discovery.preferred_city';
const Duration kLocationFreshness = Duration(minutes: 15);

class LocationController extends Notifier<LocationState> {
  int _generation = 0;

  @override
  LocationState build() {
    Future.microtask(_restore);
    return const LocationState();
  }

  Future<void> _restore() async {
    final generation = _generation;
    final preferred = await ref.read(preferencesStoreProvider).read(kPreferredCityKey);
    if (generation != _generation) return;
    if (preferred != null && preferred.isNotEmpty) {
      state = LocationState(place: AreaPlace(preferred));
      return;
    }
    if (await ref.read(locationGatewayProvider).hasPermission() && generation == _generation) {
      await useCurrentLocation();
    }
  }

  Future<void> useCurrentLocation() async {
    if (state.locating) return;
    final generation = ++_generation;
    state = LocationState(place: state.place, locating: true);
    final outcome = await ref.read(locationGatewayProvider).currentPosition();
    if (generation != _generation) return;
    final position = outcome.position;
    if (outcome.access != LocationAccess.granted || position == null) {
      state = LocationState(place: state.place, problem: outcome.access);
      return;
    }
    await ref.read(preferencesStoreProvider).remove(kPreferredCityKey);
    final near = NearMePlace(position, capturedAt: ref.read(clockProvider)());
    state = LocationState(place: near);
    try {
      final city = await ref.read(discoveryRepositoryProvider).resolveCity(position);
      if (generation == _generation && state.place is NearMePlace) {
        state = LocationState(place: near.withCity(city));
      }
    } on ApiException {
      return;
    }
  }

  Future<void> refreshIfStale() async {
    final place = state.place;
    if (place is NearMePlace && ref.read(clockProvider)().difference(place.capturedAt) > kLocationFreshness) {
      await useCurrentLocation();
    }
  }

  Future<void> chooseCity(String cityLabel) async {
    _generation++;
    state = LocationState(place: AreaPlace(cityLabel));
    await ref.read(preferencesStoreProvider).write(kPreferredCityKey, cityLabel);
  }

  Future<void> chooseAnywhere() async {
    _generation++;
    state = const LocationState();
    await ref.read(preferencesStoreProvider).remove(kPreferredCityKey);
  }

  void dismissProblem() => state = LocationState(place: state.place);

  Future<void> openSettings() async {
    final problem = state.problem;
    if (problem == null) return;
    await ref.read(locationGatewayProvider).openSettings(problem);
  }
}

final locationProvider = NotifierProvider<LocationController, LocationState>(LocationController.new);
