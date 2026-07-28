import type { ERemodelBudgetCode, ERemodelRequestStatus } from '@/entities/remodel-request';

export type TAdminRequestTabId = 'new' | 'assigned' | 'in_progress' | 'done';

export interface IAdminRequestTab {
  id: TAdminRequestTabId;
  label: string;
  statuses: readonly ERemodelRequestStatus[];
}

export interface IAdminRemodelRequestListItem {
  id: string;
  customerId: string;
  customerName: string;
  status: ERemodelRequestStatus;
  region: string;
  addressDetail: string;
  budgetRange: ERemodelBudgetCode;
  desiredSchedule: string;
  submittedAt?: string;
  createdAt: string;
  assignedPartnerNames: string[];
}
