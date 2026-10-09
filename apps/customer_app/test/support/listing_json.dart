import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Map<String, dynamic> rentListingJson({
  String id = 'rent-1',
  String title = 'Studio near the business park',
  String propertyType = 'CONDO',
  String cityLabel = 'Cebu City',
  int priceCentavos = 1800000,
  String? furnishing,
  bool? petsAllowed,
}) =>
    {
      'id': id,
      'resourceId': 'res-$id',
      'intent': 'RENT',
      'pricing': 'LISTED',
      'title': title,
      'description': 'Bright studio with balcony.',
      'propertyName': 'Park Tower',
      'propertyType': propertyType,
      'areaLabel': 'Lahug',
      'cityLabel': cityLabel,
      'kind': 'LONG_TERM',
      'resourceType': 'UNIT',
      'priceCentavos': priceCentavos,
      'hasTour': false,
      'sceneCount': 0,
      'photos': <String>[],
      'availabilityLabel': 'Available now',
      'isAvailable': true,
      'amenities': <String>[],
      'houseRules': <String>[],
      'terms': <String>[],
      'bedrooms': 1,
      'bathrooms': 1,
      'furnishing': furnishing,
      'petsAllowed': petsAllowed,
      'ownerName': 'Park Owners',
      'ownerVerified': false,
    };

Map<String, dynamic> saleListingJson({
  String id = 'sale-1',
  String title = 'Modern house and lot in Talamban',
  String propertyType = 'HOUSE',
  Object? priceCentavos,
}) =>
    {
      'id': id,
      'resourceId': 'res-$id',
      'intent': 'SALE',
      'pricing': 'ON_INQUIRY',
      'title': title,
      'description': 'Four bedrooms and a garden.',
      'propertyName': 'Talamban Residence',
      'propertyType': propertyType,
      'areaLabel': 'Talamban',
      'cityLabel': 'Cebu City',
      'kind': null,
      'resourceType': 'UNIT',
      'priceCentavos': priceCentavos,
      'hasTour': false,
      'sceneCount': 0,
      'photos': <String>[],
      'saleStatus': 'READY_FOR_OCCUPANCY',
      'availabilityLabel': 'Ready for occupancy',
      'isAvailable': true,
      'amenities': <String>[],
      'houseRules': <String>[],
      'terms': <String>[],
      'bedrooms': 4,
      'bathrooms': 3,
      'floorAreaSqm': 220,
      'furnishing': 'UNFURNISHED',
      'ownerName': 'Santos Realty',
      'ownerVerified': true,
    };

Map<String, dynamic> listingPageJson(List<Map<String, dynamic>> items, {int? total, bool hasMore = false}) =>
    {'items': items, 'total': total ?? items.length, 'hasMore': hasMore};

typedef RouteHandler = FutureOr<http.Response?> Function(http.Request request);

http.Response jsonResponse(Object body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json; charset=utf-8'});

MockClient routedClient(RouteHandler handler, {List<http.Request>? log}) => MockClient((request) async {
      log?.add(request);
      return await handler(request) ?? jsonResponse({'title': 'Not found'}, 404);
    });
