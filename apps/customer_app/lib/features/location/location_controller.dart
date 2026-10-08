import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../data/marketplace_repository.dart';

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
  Future<LocationOutcome> currentPosition();
  Future<void> openSettings(LocationAccess access);
}

class GeolocatorLocationGateway implements LocationGateway {
  const GeolocatorLocationGateway();

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
}

final class NearMePlace extends SearchPlace {
  const NearMePlace(this.position);

  final DevicePosition position;

  @override
  String get label => 'Near you';
}

final class AreaPlace extends SearchPlace {
  const AreaPlace(this.area);

  final AreaView area;

  @override
  String get label => area.cityLabel;
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

  String? get problemMessage => switch (problem) {
        LocationAccess.denied => 'Location permission was declined. Choose an area instead, or allow location to see places near you.',
        LocationAccess.deniedForever => 'Location is turned off for this app. Turn it on in Settings, or choose an area.',
        LocationAccess.serviceOff => 'Location services are off on this device. Turn them on, or choose an area.',
        LocationAccess.unavailable => 'We could not get your location right now. Choose an area or try again.',
        _ => null,
      };

  bool get canOpenSettings => problem == LocationAccess.deniedForever || problem == LocationAccess.serviceOff;
}

class LocationController extends Notifier<LocationState> {
  @override
  LocationState build() => const LocationState();

  Future<void> useCurrentLocation() async {
    if (state.locating) return;
    state = LocationState(place: state.place, locating: true);
    final outcome = await ref.read(locationGatewayProvider).currentPosition();
    final position = outcome.position;
    if (outcome.access == LocationAccess.granted && position != null) {
      state = LocationState(place: NearMePlace(position));
    } else {
      state = LocationState(place: state.place, problem: outcome.access);
    }
  }

  void chooseArea(AreaView area) => state = LocationState(place: AreaPlace(area));

  void chooseAnywhere() => state = const LocationState();

  void dismissProblem() => state = LocationState(place: state.place);

  Future<void> openSettings() async {
    final problem = state.problem;
    if (problem == null) return;
    await ref.read(locationGatewayProvider).openSettings(problem);
  }
}

final locationProvider = NotifierProvider<LocationController, LocationState>(LocationController.new);
