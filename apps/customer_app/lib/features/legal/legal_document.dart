enum LegalDocument {
  terms('terms', 'Terms & Conditions'),
  privacy('privacy', 'Privacy Policy'),
  bookingPolicy('booking-policy', 'Booking, Cancellation & Refund Policy'),
  communityGuidelines('community-guidelines', 'Community Guidelines');

  const LegalDocument(this.slug, this.title);

  final String slug;
  final String title;
}
