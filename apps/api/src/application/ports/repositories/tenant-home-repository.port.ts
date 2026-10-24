import type { TenantHome } from '@/domain/occupancy/tenant-home.ts';

export interface TenantHomeRepository {
  listForCustomer(userId: string): Promise<readonly TenantHome[]>;
  activityForCustomer(userId: string): Promise<{ hasTrips: boolean; pendingApplications: number; approvedApplications: number }>;
}
