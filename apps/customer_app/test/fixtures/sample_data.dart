import 'view_models.dart';

/// In-memory sample data for widget and integration tests.
abstract final class SampleData {
  static String _photo(String id, {int w = 900}) =>
      'https://images.unsplash.com/$id?q=80&w=$w&auto=format&fit=crop';

  // Living spaces
  static String get _living => _photo('photo-1560448204-e02f11c3d0e2');
  static String get _livingAlt => _photo('photo-1502672260266-1c1ef2d93688');

  // Condo
  static String get _condoA => _photo('photo-1512918728675-ed5a9ecdebfd');
  static String get _condoC => _photo('photo-1586023492125-27b2c045efd7');

  // Short stay
  static String get _stayA => _photo('photo-1583847268964-b28dc8f51f92');
  static String get _stayB => _photo('photo-1484154218962-a197022b5858');

  // Rooms and beds
  static String get _bedA => _photo('photo-1594295800284-990f74bb6928');

  /// The 360° kitchen from the design reference.
  static String get _kitchen360 =>
      _photo('photo-1758565811176-ccd94357a844', w: 1400);

  static List<ListingCardView> get listings => [
        const ListingCardView(
          id: 'lst-unit-203',
          title: 'One-bedroom corner unit with cross-ventilation',
          propertyName: 'ABC Apartment',
          areaLabel: 'Brgy. Kamputhaw',
          cityLabel: 'Cebu City',
          kind: ListingKind.longTerm,
          resourceType: ResourceType.unit,
          priceCentavos: 850000,
          availabilityLabel: 'Available now',
          isAvailable: true,
          hasTour: true,
          sceneCount: 5,
          isFeatured: true,
          photos: [
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=900&auto=format&fit=crop',
          ],
          moveInCost: MoveInCostView(
            lines: [
              (label: 'First month rent', centavos: 850000),
              (label: 'Advance (1 month)', centavos: 850000),
              (label: 'Deposit (2 months)', centavos: 1700000),
            ],
            totalCentavos: 3400000,
          ),
        ),
        const ListingCardView(
          id: 'lst-condo-101-lt',
          title: 'Furnished condo with balcony, east-facing',
          propertyName: 'Skyline Residences',
          areaLabel: 'Brgy. Apas',
          cityLabel: 'Cebu City',
          kind: ListingKind.longTerm,
          resourceType: ResourceType.unit,
          priceCentavos: 1500000,
          availabilityLabel: 'Available Jan 1',
          isAvailable: true,
          hasTour: true,
          sceneCount: 7,
          isFeatured: true,
          photos: [
            'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=900&auto=format&fit=crop',
          ],
          moveInCost: MoveInCostView(
            lines: [
              (label: 'First month rent', centavos: 1500000),
              (label: 'Advance (1 month)', centavos: 1500000),
              (label: 'Deposit (2 months)', centavos: 3000000),
            ],
            totalCentavos: 6000000,
          ),
        ),
        const ListingCardView(
          id: 'lst-condo-101-st',
          title: 'Condo stay, walking distance to IT Park',
          propertyName: 'Skyline Residences',
          areaLabel: 'Brgy. Apas',
          cityLabel: 'Cebu City',
          kind: ListingKind.shortTerm,
          resourceType: ResourceType.unit,
          priceCentavos: 150000,
          availabilityLabel: 'Dec 26–29 taken',
          isAvailable: true,
          hasTour: true,
          sceneCount: 7,
          photos: [
            'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1613575831056-0acd5da8f085?q=80&w=900&auto=format&fit=crop',
          ],
        ),
        const ListingCardView(
          id: 'lst-bed-a',
          title: 'Bed space near USC, all-in utilities',
          propertyName: 'Villa Boarding House',
          areaLabel: 'Brgy. Sambag II',
          cityLabel: 'Cebu City',
          kind: ListingKind.longTerm,
          resourceType: ResourceType.bedSpace,
          priceCentavos: 350000,
          availabilityLabel: 'Available now',
          isAvailable: true,
          hasTour: true,
          sceneCount: 3,
          photos: [
            'https://images.unsplash.com/photo-1594295800284-990f74bb6928?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1652882861012-95f3263cab63?q=80&w=900&auto=format&fit=crop',
          ],
          moveInCost: MoveInCostView(
            lines: [
              (label: 'First month rent', centavos: 350000),
              (label: 'Advance (1 month)', centavos: 350000),
              (label: 'Deposit (1 month)', centavos: 350000),
            ],
            totalCentavos: 1050000,
          ),
        ),
        const ListingCardView(
          id: 'lst-room-102',
          title: 'Private room with own CR',
          propertyName: 'Villa Boarding House',
          areaLabel: 'Brgy. Sambag II',
          cityLabel: 'Cebu City',
          kind: ListingKind.longTerm,
          resourceType: ResourceType.room,
          priceCentavos: 600000,
          availabilityLabel: 'Fully occupied',
          isAvailable: false,
          hasTour: false,
          sceneCount: 0,
          photos: [
            'https://images.unsplash.com/photo-1582068019386-a943ee9287ae?q=80&w=900&auto=format&fit=crop',
          ],
          moveInCost: MoveInCostView(
            lines: [
              (label: 'First month rent', centavos: 600000),
              (label: 'Advance (1 month)', centavos: 600000),
              (label: 'Deposit (2 months)', centavos: 1200000),
            ],
            totalCentavos: 2400000,
          ),
        ),
        const ListingCardView(
          id: 'lst-parking-12',
          title: 'Covered parking slot, 24/7 access',
          propertyName: 'ABC Apartment',
          areaLabel: 'Brgy. Kamputhaw',
          cityLabel: 'Cebu City',
          kind: ListingKind.longTerm,
          resourceType: ResourceType.parking,
          priceCentavos: 200000,
          availabilityLabel: 'Available now',
          isAvailable: true,
          hasTour: false,
          sceneCount: 0,
          photos: [
            'https://images.unsplash.com/photo-1585128792020-803d29415281?q=80&w=900&auto=format&fit=crop',
          ],
          moveInCost: MoveInCostView(
            lines: [
              (label: 'First month', centavos: 200000),
              (label: 'Deposit (1 month)', centavos: 200000),
            ],
            totalCentavos: 400000,
          ),
        ),
        const ListingCardView(
          id: 'lst-studio-7',
          title: 'Studio near Ayala, newly repainted',
          propertyName: 'Mabolo Flats',
          areaLabel: 'Brgy. Mabolo',
          cityLabel: 'Cebu City',
          kind: ListingKind.longTerm,
          resourceType: ResourceType.unit,
          priceCentavos: 1100000,
          availabilityLabel: 'Available Sep 15',
          isAvailable: true,
          hasTour: false,
          sceneCount: 0,
          photos: [
            'https://images.unsplash.com/photo-1737467023078-a694673d7cb3?q=80&w=900&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1702014862053-946a122b920d?q=80&w=900&auto=format&fit=crop',
          ],
          moveInCost: MoveInCostView(
            lines: [
              (label: 'First month rent', centavos: 1100000),
              (label: 'Advance (1 month)', centavos: 1100000),
              (label: 'Deposit (2 months)', centavos: 2200000),
            ],
            totalCentavos: 4400000,
          ),
        ),
      ];

  static List<BookingView> get bookings => [
        BookingView(
          id: 'bkg-4471',
          reference: 'BK-2026-4471',
          listingTitle: 'Condo stay, walking distance to IT Park',
          propertyName: 'Skyline Residences',
          areaLabel: 'Brgy. Apas, Cebu City',
          photo: _stayA,
          checkIn: DateTime(2026, 12, 26),
          checkOut: DateTime(2026, 12, 29),
          nights: 3,
          guests: 2,
          totalCentavos: 450000,
          status: BookingStatus.active,
          stateLabel: 'Confirmed',
        ),
        BookingView(
          id: 'bkg-4208',
          reference: 'BK-2026-4208',
          listingTitle: 'Condo stay, walking distance to IT Park',
          propertyName: 'Skyline Residences',
          areaLabel: 'Brgy. Apas, Cebu City',
          photo: _stayB,
          checkIn: DateTime(2026, 6, 12),
          checkOut: DateTime(2026, 6, 15),
          nights: 3,
          guests: 1,
          totalCentavos: 450000,
          status: BookingStatus.past,
          stateLabel: 'Completed',
        ),
        BookingView(
          id: 'bkg-3990',
          reference: 'BK-2026-3990',
          listingTitle: 'Studio near Ayala, newly repainted',
          propertyName: 'Mabolo Flats',
          areaLabel: 'Brgy. Mabolo, Cebu City',
          photo: _stayA,
          checkIn: DateTime(2026, 3, 2),
          checkOut: DateTime(2026, 3, 4),
          nights: 2,
          guests: 2,
          totalCentavos: 300000,
          status: BookingStatus.past,
          stateLabel: 'Completed',
        ),
      ];

  static List<ApplicationView> get applications => [
        ApplicationView(
          id: 'app-0311',
          reference: 'AP-2026-0311',
          listingTitle: 'One-bedroom corner unit with cross-ventilation',
          propertyName: 'ABC Apartment',
          areaLabel: 'Brgy. Kamputhaw, Cebu City',
          photo: _living,
          monthlyCentavos: 850000,
          moveIn: DateTime(2026, 9, 1),
          submittedAt: DateTime(2026, 8, 18, 9, 12),
          status: ApplicationStatus.underReview,
          documents: const [
            'Valid government ID',
            'Proof of income',
            'Barangay clearance',
          ],
        ),
        ApplicationView(
          id: 'app-0298',
          reference: 'AP-2026-0298',
          listingTitle: 'Bed space near USC, all-in utilities',
          propertyName: 'Villa Boarding House',
          areaLabel: 'Brgy. Sambag II, Cebu City',
          photo: _bedA,
          monthlyCentavos: 350000,
          moveIn: DateTime(2026, 9, 1),
          submittedAt: DateTime(2026, 8, 9, 14, 30),
          status: ApplicationStatus.approved,
          documents: const ['Valid government ID', 'Proof of income'],
          decidedAt: DateTime(2026, 8, 19, 16, 5),
          moveInCostCentavos: 1050000,
          holdExpiresAt: DateTime(2026, 8, 22, 16, 5),
        ),
        ApplicationView(
          id: 'app-0244',
          reference: 'AP-2026-0244',
          listingTitle: 'Furnished condo with balcony, east-facing',
          propertyName: 'Skyline Residences',
          areaLabel: 'Brgy. Apas, Cebu City',
          photo: _condoA,
          monthlyCentavos: 1500000,
          moveIn: DateTime(2026, 7, 15),
          submittedAt: DateTime(2026, 6, 28, 10, 0),
          status: ApplicationStatus.rejected,
          documents: const ['Valid government ID', 'Proof of income'],
          decidedAt: DateTime(2026, 7, 2, 11, 20),
          reason: 'The owner accepted an application submitted a few days '
              'earlier. Nothing to do with your documents.',
        ),
      ];

  static ApplicationView? applicationById(String id) {
    for (final a in applications) {
      if (a.id == id) return a;
    }
    return null;
  }

  static BookingView? bookingById(String id) {
    for (final b in bookings) {
      if (b.id == id) return b;
    }
    return null;
  }

  static List<BookingView> bookingsWith(BookingStatus status) =>
      bookings.where((b) => b.status == status).toList();

  static List<ListingCardView> get featured =>
      listings.where((l) => l.isFeatured).toList();

  static ListingCardView? cardById(String id) {
    for (final listing in listings) {
      if (listing.id == id) return listing;
    }
    return null;
  }

  static ListingDetailView? detailById(String id) {
    final card = cardById(id);
    if (card == null) return null;

    final isLongTerm = card.kind == ListingKind.longTerm;

    return ListingDetailView(
      card: card,
      description: _descriptions[id] ?? _descriptions['default']!,
      amenities: _amenities[card.resourceType] ?? const [],
      sharedFacilities: card.resourceType == ResourceType.bedSpace
          ? const [
              'CR — shared with 3 others on the floor',
              'Kitchen — shared, with your own shelf',
              'Laundry area — shared, no schedule',
              'Wi-Fi — shared line, included in rent',
            ]
          : const [],
      terms: isLongTerm
          ? const [
              '12-month minimum term',
              'Water and electricity billed separately',
              'Rent due on the 5th of each month',
            ]
          : const [
              'Check-in 2:00 PM · check-out 12:00 NN',
              'Full payment on booking',
              'Free cancellation up to 7 days before check-in',
            ],
      houseRules: isLongTerm
          ? const ['No pets', 'No smoking indoors', 'Visitors until 10 PM']
          : const ['No parties', 'No smoking indoors', 'Quiet hours after 10 PM'],
      ownerName: _owners[card.propertyName] ?? 'Verified owner',
      ownerVerified: true,
      minimumStayNights: isLongTerm ? null : 2,
      blockedRanges: isLongTerm
          ? const []
          : [
              (from: DateTime(2026, 12, 26), to: DateTime(2026, 12, 29)),
              (from: DateTime(2026, 9, 4), to: DateTime(2026, 9, 7)),
            ],
      scenes: _scenes[id] ?? const [],
    );
  }

  static const Map<String, String> _owners = {
    'ABC Apartment': 'Santos Property Holdings',
    'Skyline Residences': 'Skyline Property Management',
    'Villa Boarding House': 'Villa Rentals',
    'Mabolo Flats': 'Mabolo Property Group',
  };

  static const Map<String, String> _descriptions = {
    'default':
        'Clean, well-maintained, and close to everything. Ask the owner through '
        'the app about anything this page does not cover.',
    'lst-unit-203':
        'Second-floor corner unit with windows on two sides, so it stays cool '
        'without running the aircon all day. Inverter aircon in the bedroom. '
        'Jeepney routes at the corner, a 24-hour convenience store downstairs, '
        'and Fuente Osmeña is a ten-minute walk.',
    'lst-condo-101-lt':
        'Fully furnished 32 sqm unit facing east, so you get morning light and '
        'the afternoon stays manageable. Building has a generator, gym, and '
        '24/7 security. Fibre-ready.',
    'lst-condo-101-st':
        'The same condo, available nightly between long-term tenancies. Fresh '
        'linens, fast Wi-Fi, and a proper desk by the window.',
    'lst-bed-a':
        'Lower bunk in a four-person room, with a personal locker and a study '
        'lamp of your own. Rent is all-in: water, electricity, and Wi-Fi. Five '
        'minutes on foot to USC Main.',
    'lst-parking-12':
        'Covered slot on the ground floor, wide enough for a mid-size SUV. '
        'Gate is manned 24/7 and the area is on CCTV.',
    'lst-studio-7':
        'Compact studio, freshly repainted, with a small balcony for drying. '
        'Walking distance to Ayala Center and the Mabolo church area.',
  };

  static const Map<ResourceType, List<String>> _amenities = {
    ResourceType.unit: [
      'Inverter aircon',
      'Own kitchen',
      'Own CR',
      'Fibre-ready',
      'Water heater',
      'Parking available',
    ],
    ResourceType.room: ['Aircon', 'Own CR', 'Shared kitchen', 'Wi-Fi'],
    ResourceType.bedSpace: [
      'Personal locker',
      'Study lamp',
      'Wi-Fi included',
      'Utilities included',
    ],
    ResourceType.parking: ['Covered', '24/7 access', 'CCTV', 'Manned gate'],
    ResourceType.storage: ['Covered', 'CCTV'],
  };

  static Map<String, List<SceneView>> get _scenes => {
        'lst-unit-203': [
          SceneView(
            label: 'Living room',
            imageUrl: _living,
            hotspots: const [
              HotspotView(
                kind: HotspotKind.navigation,
                x: 0.28,
                y: 0.24,
                label: 'Kitchen',
                targetScene: 1,
              ),
              HotspotView(
                kind: HotspotKind.navigation,
                x: 0.70,
                y: 0.70,
                label: 'Bedroom',
                targetScene: 2,
              ),
              HotspotView(
                kind: HotspotKind.info,
                x: 0.62,
                y: 0.33,
                note: 'Inverter aircon — included in rent',
              ),
            ],
          ),
          SceneView(
            label: 'Kitchen',
            imageUrl: _kitchen360,
            hotspots: const [
              HotspotView(
                kind: HotspotKind.navigation,
                x: 0.30,
                y: 0.58,
                label: 'Living room',
                targetScene: 0,
              ),
              HotspotView(
                kind: HotspotKind.info,
                x: 0.70,
                y: 0.40,
                note: 'Gas range and tank stay with the unit',
              ),
            ],
          ),
          SceneView(
            label: 'Bedroom',
            imageUrl: _bedA,
            hotspots: const [
              HotspotView(
                kind: HotspotKind.navigation,
                x: 0.30,
                y: 0.62,
                label: 'CR',
                targetScene: 3,
              ),
              HotspotView(
                kind: HotspotKind.info,
                x: 0.70,
                y: 0.30,
                note: 'Fits a queen bed with room to walk around',
              ),
            ],
          ),
          SceneView(
            label: 'CR',
            imageUrl: _condoC,
            hotspots: const [
              HotspotView(
                kind: HotspotKind.navigation,
                x: 0.30,
                y: 0.66,
                label: 'Bedroom',
                targetScene: 2,
              ),
              HotspotView(
                kind: HotspotKind.info,
                x: 0.66,
                y: 0.38,
                note: 'Water heater installed last year',
              ),
            ],
          ),
          SceneView(
            label: 'Balcony',
            imageUrl: _livingAlt,
            hotspots: const [
              HotspotView(
                kind: HotspotKind.navigation,
                x: 0.32,
                y: 0.60,
                label: 'Living room',
                targetScene: 0,
              ),
            ],
          ),
        ],
      };

  static List<SceneView> scenesFor(String listingId) {
    final direct = _scenes[listingId];
    if (direct != null) return direct;

    const sharesUnit203Tour = {
      'lst-condo-101-lt',
      'lst-condo-101-st',
      'lst-bed-a',
    };
    if (sharesUnit203Tour.contains(listingId)) {
      return _scenes['lst-unit-203']!;
    }
    return const [];
  }
}
