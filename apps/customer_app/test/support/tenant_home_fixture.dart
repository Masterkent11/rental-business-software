import 'package:customer_app/features/my_home/domain/tenant_home.dart';

TenantHome homeFixture({String id = 'home', bool paid = false}) => TenantHome(
      id: id,
      title: 'The Orchard Residences',
      unit: 'Unit 12A',
      address: 'Cebu Business Park, Cebu City',
      area: 'Cebu Business Park',
      propertyType: 'Condo',
      landlordName: 'Property Management',
      description:
          'A modern and spacious 2-bedroom condominium in the heart of Cebu Business Park with premium amenities and city views.',
      listingId: 'listing',
      startsOn: DateTime.utc(2026, 1, 1),
      endsOn: DateTime.utc(2027, 1, 1),
      asOf: DateTime.utc(2026, 10, 24),
      photos: const ['https://example.test/property.jpg', 'https://example.test/property2.jpg'],
      amenities: const [
        'Swimming Pool',
        'Gym',
        '24/7 Security',
        'Parking',
        'Function Room',
        'Elevator',
        'Sky Lounge',
        'WiFi'
      ],
      rules: const ['Quiet hours after 10 PM'],
      invoices: [
        TenantInvoice(
            id: 'invoice',
            number: 12,
            dueOn: DateTime.utc(2026, 11, 5),
            total: 2500000,
            paid: paid ? 2500000 : 0,
            outstanding: paid ? 0 : 2500000,
            state: paid ? 'PAID' : 'ISSUED',
            onlinePaymentAvailable: false)
      ],
    );
