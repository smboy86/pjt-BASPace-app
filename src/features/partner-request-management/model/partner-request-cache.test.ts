import { describe, expect, it, vi } from 'vitest';
import { ERequestPartnerStatus } from '../../../entities/partner/types';
import {
  ERemodelBudgetCode,
  ERemodelRequestStatus,
  ERemodelScope,
  type IRemodelRequest,
} from '../../../entities/remodel-request/types';
import type {
  IPartnerRemodelRequestDetail,
  IPartnerRemodelRequestListItem,
} from '../types';
import {
  applyPartnerResponseToDetailCache,
  applyPartnerResponseToListCache,
} from './partner-request-cache';

vi.mock('@/entities/partner', () => ({
  ERequestPartnerStatus: {
    ACCEPTED: 'accepted',
    ASSIGNED: 'assigned',
    DECLINED: 'declined',
  },
}));

vi.mock('@/entities/remodel-request', () => ({
  ERemodelRequestStatus: {
    IN_CONSULTATION: 'in_consultation',
  },
}));

const REQUEST_ID = 'request-1';

const LIST_ITEM: IPartnerRemodelRequestListItem = {
  id: REQUEST_ID,
  assignmentId: 'assignment-1',
  assignmentStatus: ERequestPartnerStatus.ASSIGNED,
  status: ERemodelRequestStatus.MATCHED,
  customerName: '김고객',
  region: '서울시 중구',
  addressDetail: '101동 101호',
  budgetRange: ERemodelBudgetCode.KRW_300_500,
  desiredSchedule: '2개월 이내',
  createdAt: '2026-07-29T10:00:00.000Z',
};

const REQUEST: IRemodelRequest = {
  id: REQUEST_ID,
  customerId: 'customer-1',
  status: ERemodelRequestStatus.MATCHED,
  region: '서울시 중구',
  addressDetail: '101동 101호',
  housingType: '아파트',
  bathroomType: '공용 욕실',
  budgetRange: ERemodelBudgetCode.KRW_300_500,
  desiredSchedule: '2개월 이내',
  scope: ERemodelScope.FULL,
  priorities: [],
  notes: '',
  photos: [],
  selections: [],
  createdAt: '2026-07-29T10:00:00.000Z',
  updatedAt: '2026-07-29T10:00:00.000Z',
};

const DETAIL: IPartnerRemodelRequestDetail = {
  request: REQUEST,
  customerName: '김고객',
  assignmentId: 'assignment-1',
  assignmentStatus: ERequestPartnerStatus.ASSIGNED,
};

describe('partner request response cache', () => {
  it('moves a proceeded assignment and request to their in-progress states immediately', () => {
    expect(
      applyPartnerResponseToListCache(
        [LIST_ITEM],
        REQUEST_ID,
        ERequestPartnerStatus.ACCEPTED,
      )?.[0],
    ).toEqual(
      expect.objectContaining({
        assignmentStatus: ERequestPartnerStatus.ACCEPTED,
        status: ERemodelRequestStatus.IN_CONSULTATION,
      }),
    );

    expect(
      applyPartnerResponseToDetailCache(DETAIL, ERequestPartnerStatus.ACCEPTED),
    ).toEqual(
      expect.objectContaining({
        assignmentStatus: ERequestPartnerStatus.ACCEPTED,
        request: expect.objectContaining({
          status: ERemodelRequestStatus.IN_CONSULTATION,
        }),
      }),
    );
  });

  it('moves a declined assignment immediately without guessing the request-wide status', () => {
    expect(
      applyPartnerResponseToListCache(
        [LIST_ITEM],
        REQUEST_ID,
        ERequestPartnerStatus.DECLINED,
      )?.[0],
    ).toEqual(
      expect.objectContaining({
        assignmentStatus: ERequestPartnerStatus.DECLINED,
        status: ERemodelRequestStatus.MATCHED,
      }),
    );
  });
});
