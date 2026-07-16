import { create } from 'zustand';
import { ERequestPartnerStatus, IPartner, IRequestPartner, TCreatePartnerInput } from '../types';

interface IPartnerState {
  partners: IPartner[];
  requestPartners: IRequestPartner[];
  createPartner: (input: TCreatePartnerInput) => IPartner;
  assignPartner: (requestId: string, partnerId: string) => IRequestPartner;
  respondToAssignment: (
    requestPartnerId: string,
    status: ERequestPartnerStatus.ACCEPTED | ERequestPartnerStatus.DECLINED,
    responseNote?: string,
  ) => void;
  getPartnersByRequestId: (requestId: string) => IRequestPartner[];
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const usePartnerStore = create<IPartnerState>((set, get) => ({
  partners: [],
  requestPartners: [],
  createPartner: (input) => {
    const now = new Date().toISOString();
    const partner: IPartner = { ...input, id: createId('partner'), createdAt: now, updatedAt: now };
    set((state) => ({ partners: [...state.partners, partner] }));
    return partner;
  },
  assignPartner: (requestId, partnerId) => {
    const assignment: IRequestPartner = {
      id: createId('request-partner'),
      requestId,
      partnerId,
      status: ERequestPartnerStatus.ASSIGNED,
      assignedAt: new Date().toISOString(),
    };
    set((state) => ({ requestPartners: [...state.requestPartners, assignment] }));
    return assignment;
  },
  respondToAssignment: (requestPartnerId, status, responseNote) => {
    set((state) => ({
      requestPartners: state.requestPartners.map((assignment) =>
        assignment.id === requestPartnerId
          ? { ...assignment, status, responseNote, respondedAt: new Date().toISOString() }
          : assignment,
      ),
    }));
  },
  getPartnersByRequestId: (requestId) =>
    get().requestPartners.filter((assignment) => assignment.requestId === requestId),
}));
