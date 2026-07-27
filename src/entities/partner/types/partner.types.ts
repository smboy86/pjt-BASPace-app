export enum EPartnerApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  INACTIVE = 'inactive',
}

export enum ERequestPartnerStatus {
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export interface IPartner {
  id: string;
  companyName: string;
  businessNumber: string;
  businessRegistrationImagePath: string | null;
  contactName: string;
  contactPhone: string;
  note: string | null;
  serviceRegions: string[];
  serviceTypes: string[];
  approvalStatus: EPartnerApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IRequestPartner {
  id: string;
  requestId: string;
  partnerId: string;
  status: ERequestPartnerStatus;
  responseNote?: string;
  assignedAt: string;
  respondedAt?: string;
}

export type TCreatePartnerInput = Omit<IPartner, 'id' | 'createdAt' | 'updatedAt'>;
