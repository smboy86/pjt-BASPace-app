import type { ERequestPartnerStatus } from '@/entities/partner';
import type {
  ERemodelBudgetCode,
  ERemodelRequestStatus,
  IRemodelRequest,
} from '@/entities/remodel-request';

export interface IPartnerRemodelRequestListItem {
  id: string;
  assignmentId: string;
  assignmentStatus: ERequestPartnerStatus;
  status: ERemodelRequestStatus;
  customerName: string;
  region: string;
  addressDetail: string;
  budgetRange: ERemodelBudgetCode;
  desiredSchedule: string;
  submittedAt?: string;
  createdAt: string;
}

export interface IPartnerRemodelRequestDetail {
  request: IRemodelRequest;
  customerName: string;
  assignmentId: string;
  assignmentStatus: ERequestPartnerStatus;
}

export interface IRespondToPartnerRequestInput {
  requestId: string;
  action: 'proceed' | 'decline';
}
