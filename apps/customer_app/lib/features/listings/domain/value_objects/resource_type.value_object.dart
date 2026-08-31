enum ResourceType {
  unit('Apartment / Condo'),
  room('Private room'),
  bedSpace('Bed space'),
  parking('Parking slot'),
  storage('Storage space');

  const ResourceType(this.label);
  final String label;
}
