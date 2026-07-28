import { beforeEach, describe, expect, it } from 'vitest';
import {
  ERemodelBudgetCode,
  ERemodelRequestStatus,
  ERemodelScope,
  type IRemodelRequest,
} from '../types';
import { useRemodelRequestStore } from './remodel-request.store';

const createRequest = (input: Partial<IRemodelRequest> = {}): IRemodelRequest => ({
  addressDetail: '101동 101호',
  bathroomType: '공용 욕실',
  budgetRange: ERemodelBudgetCode.CONSULTATION,
  createdAt: '2026-07-28T00:00:00.000Z',
  customerId: 'customer-1',
  desiredSchedule: '2개월 이내',
  hasBathtub: false,
  housingType: '아파트',
  id: 'request-1',
  notes: '',
  photos: [],
  priorities: [],
  region: '서울시 중구',
  requiresDemolition: true,
  scope: ERemodelScope.FULL,
  selections: [],
  status: ERemodelRequestStatus.SUBMITTED,
  updatedAt: '2026-07-28T00:00:00.000Z',
  ...input,
});

describe('useRemodelRequestStore hydration', () => {
  beforeEach(() => {
    useRemodelRequestStore.setState({ requests: [] });
  });

  it('keeps local-only photos while replacing request fields with server data', () => {
    const localPhoto = {
      category: '욕실 사진',
      createdAt: '2026-07-28T00:00:00.000Z',
      id: 'local-photo-1',
      localUri: 'file:///bathroom.jpg',
      sortOrder: 0,
    };

    useRemodelRequestStore.setState({
      requests: [createRequest({ notes: '로컬 요청', photos: [localPhoto] })],
    });

    useRemodelRequestStore
      .getState()
      .hydrateRequests([createRequest({ notes: '서버 요청', photos: [] })]);

    expect(useRemodelRequestStore.getState().requests).toEqual([
      expect.objectContaining({
        notes: '서버 요청',
        photos: [localPhoto],
      }),
    ]);
  });

  it('clears hydrated requests at the session boundary', () => {
    useRemodelRequestStore.setState({ requests: [createRequest()] });

    useRemodelRequestStore.getState().clearRequests();

    expect(useRemodelRequestStore.getState().requests).toEqual([]);
  });
});
