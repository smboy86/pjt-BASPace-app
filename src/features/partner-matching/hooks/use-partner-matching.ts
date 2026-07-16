import { ERequestPartnerStatus, usePartnerStore } from '@entities/partner';
import { ERemodelRequestStatus, useRemodelRequestStore } from '@entities/remodel-request';

export const usePartnerMatching = () => {
  const assignPartner = usePartnerStore((state) => state.assignPartner);
  const respondToAssignment = usePartnerStore((state) => state.respondToAssignment);
  const setRequestStatus = useRemodelRequestStore((state) => state.setStatus);

  const matchPartner = (requestId: string, partnerId: string) => {
    const assignment = assignPartner(requestId, partnerId);
    setRequestStatus(requestId, ERemodelRequestStatus.MATCHED);
    return assignment;
  };

  const respondToMatch = (
    requestPartnerId: string,
    status: ERequestPartnerStatus.ACCEPTED | ERequestPartnerStatus.DECLINED,
    responseNote?: string,
  ) => respondToAssignment(requestPartnerId, status, responseNote);

  return { matchPartner, respondToMatch };
};
