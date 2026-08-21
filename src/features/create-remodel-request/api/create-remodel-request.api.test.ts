import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERemodelBudgetCode } from '../../../entities/remodel-request/types';
import { submitRemodelRequest } from './create-remodel-request.api';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    storage: {
      from: () => ({ remove: mocks.remove, upload: mocks.upload }),
    },
  }),
}));

vi.mock('@/entities/remodel-request', () => ({
  ERemodelRequestStatus: { SUBMITTED: 'submitted' },
  ERemodelScope: { FULL: 'full' },
  ESelectionDecision: { SELECTED: 'selected' },
}));

describe('submit remodel request api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'customer-1' } },
      error: null,
    });
    mocks.remove.mockResolvedValue({ data: [], error: null });
    mocks.rpc.mockResolvedValue({ data: 'request-1', error: null });
    mocks.upload.mockResolvedValue({ data: {}, error: null });
  });

  it('sends the required construction type and exact desired date', async () => {
    const result = await submitRemodelRequest({
      addressDetail: '101동 101호',
      bathroomHeight: 2200,
      bathroomLength: 1800,
      bathroomWidth: 1600,
      budgetCode: ERemodelBudgetCode.CONSULTATION,
      customerId: 'customer-1',
      desiredConstructionDate: '2026-08-20',
      notes: '',
      photos: [],
      region: '서울특별시 중구 세종대로 110',
      requiresDemolition: false,
      selections: [],
    });

    expect(mocks.rpc).toHaveBeenCalledWith('submit_customer_remodel_request_with_photos', {
      target_address_detail: '101동 101호',
      target_bathroom_height: 2200,
      target_bathroom_length: 1800,
      target_bathroom_width: 1600,
      target_budget_range: ERemodelBudgetCode.CONSULTATION,
      target_desired_construction_date: '2026-08-20',
      target_notes: '',
      target_photos: [],
      target_region: '서울특별시 중구 세종대로 110',
      target_requires_demolition: false,
      target_selections: [],
    });
    expect(result).toMatchObject({
      desiredSchedule: '2026-08-20',
      bathroomHeight: 2200,
      bathroomLength: 1800,
      bathroomWidth: 1600,
      requiresDemolition: false,
    });
  });

  it('preserves the all-zero unavailable bathroom measurement', async () => {
    const result = await submitRemodelRequest({
      addressDetail: '',
      bathroomHeight: 0,
      bathroomLength: 0,
      bathroomWidth: 0,
      budgetCode: ERemodelBudgetCode.CONSULTATION,
      customerId: 'customer-1',
      desiredConstructionDate: '2026-08-20',
      notes: '',
      photos: [],
      region: '서울특별시 중구 세종대로 110',
      requiresDemolition: false,
      selections: [],
    });

    expect(mocks.rpc).toHaveBeenCalledWith(
      'submit_customer_remodel_request_with_photos',
      expect.objectContaining({
        target_bathroom_height: 0,
        target_bathroom_length: 0,
        target_bathroom_width: 0,
      }),
    );
    expect(result).toMatchObject({
      bathroomHeight: 0,
      bathroomLength: 0,
      bathroomWidth: 0,
    });
  });

  it('removes an uploaded photo when the atomic request RPC fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]).buffer),
      }),
    );
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('rpc failed') });

    await expect(
      submitRemodelRequest({
        addressDetail: '',
        bathroomHeight: 0,
        bathroomLength: 0,
        bathroomWidth: 0,
        budgetCode: ERemodelBudgetCode.CONSULTATION,
        customerId: 'customer-1',
        desiredConstructionDate: '2026-08-20',
        notes: '',
        photos: [
          {
            id: 'local-photo-1',
            localUri: 'file:///bathroom.jpg',
            category: '욕실 사진',
            sortOrder: 0,
            createdAt: '2026-08-20T00:00:00.000Z',
          },
        ],
        region: '서울특별시 중구 세종대로 110',
        requiresDemolition: false,
        selections: [],
      }),
    ).rejects.toThrow('rpc failed');

    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^customer-1\/.*\.jpg$/),
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', upsert: false },
    );
    expect(mocks.remove).toHaveBeenCalledWith([
      expect.stringMatching(/^customer-1\/.*\.jpg$/),
    ]);
  });
});
