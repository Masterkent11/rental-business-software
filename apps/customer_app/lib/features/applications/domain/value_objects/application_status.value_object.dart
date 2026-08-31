enum ApplicationStatus {
  submitted('Submitted'),
  underReview('Under review'),
  approved('Approved'),
  rejected('Not approved'),
  withdrawn('Withdrawn'),
  expired('Expired');

  const ApplicationStatus(this.label);
  final String label;
}
