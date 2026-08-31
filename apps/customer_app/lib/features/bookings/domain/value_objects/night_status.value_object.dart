enum NightStatus { open, held, booked, leased, blocked }

extension NightStatusX on NightStatus {
  bool get isTaken => this != NightStatus.open;
}
