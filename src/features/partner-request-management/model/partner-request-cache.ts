import { ERequestPartnerStatus } from '@/entities/partner';
import { ERemodelRequestStatus } from '@/entities/remodel-request';
import type {
  IPartnerRemodelRequestDetail,
  IPartnerRemodelRequestListItem,
} from '../types';

const getResponseRequestStatus = (
  currentStatus: ERemodelRequestStatus,
  assignmentStatus: ERequestPartnerStatus,
): ERemodelRequestStatus =>
  assignmentStatus === ERequestPartnerStatus.ACCEPTED
    ? ERemodelRequestStatus.IN_CONSULTATION
    : currentStatus;

export const applyPartnerResponseToListCache = (
  current: IPartnerRemodelRequestListItem[] | undefined,
  requestId: string,
  assignmentStatus: ERequestPartnerStatus,
): IPartnerRemodelRequestListItem[] | undefined =>
  current?.map((request) =>
    request.id === requestId
      ? {
          ...request,
          assignmentStatus,
          status: getResponseRequestStatus(request.status, assignmentStatus),
        }
      : request,
  );

export const applyPartnerResponseToDetailCache = (
  current: IPartnerRemodelRequestDetail | undefined,
  assignmentStatus: ERequestPartnerStatus,
): IPartnerRemodelRequestDetail | undefined =>
  current
    ? {
        ...current,
        assignmentStatus,
        request: {
          ...current.request,
          status: getResponseRequestStatus(current.request.status, assignmentStatus),
        },
      }
    : undefined;
