export interface LeadAssignmentSettings {
  readonly responseWindowMinutes: number;
  readonly sweepIntervalSeconds: number;
}

export interface AssignableListing {
  readonly id: string;
  readonly organizationId: string;
  readonly propertyType: string | null;
  readonly areaLabel: string;
  readonly cityLabel: string;
}
