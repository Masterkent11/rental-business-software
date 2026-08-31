enum BookingStatus {
  active('Active'),
  past('Past'),
  cancelled('Cancelled');

  const BookingStatus(this.label);
  final String label;
}
