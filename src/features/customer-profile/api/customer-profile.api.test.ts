import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchCustomerProfile, updateCustomerProfile } from './customer-profile.api';

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  selectAfterUpdate: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: mocks.eq,
      }),
      update: mocks.update,
    }),
  }),
}));

const CUSTOMER_ID = '29ef5f2d-894d-4aa0-949d-a23811a028b8';
const PROFILE_ROW = {
  id: CUSTOMER_ID,
  display_name: '홍길동',
  phone: '01012345678',
  updated_at: '2026-07-29T09:00:00.000Z',
};

describe('customer profile api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockReturnValue({ single: mocks.single });
    mocks.selectAfterUpdate.mockReturnValue({ single: mocks.single });
    mocks.updateEq.mockReturnValue({
      select: mocks.selectAfterUpdate,
    });
    mocks.update.mockReturnValue({
      eq: mocks.updateEq,
    });
    mocks.single.mockResolvedValue({ data: PROFILE_ROW, error: null });
  });

  test('loads and maps the current customer profile', async () => {
    await expect(fetchCustomerProfile(CUSTOMER_ID)).resolves.toEqual({
      id: CUSTOMER_ID,
      name: '홍길동',
      phone: '01012345678',
      updatedAt: '2026-07-29T09:00:00.000Z',
    });
    expect(mocks.eq).toHaveBeenCalledWith('id', CUSTOMER_ID);
  });

  test('updates only the editable profile fields', async () => {
    await expect(
      updateCustomerProfile({
        customerId: CUSTOMER_ID,
        name: ' 새 이름 ',
        phone: null,
      }),
    ).resolves.toMatchObject({
      id: CUSTOMER_ID,
      name: '홍길동',
    });
    expect(mocks.update).toHaveBeenCalledWith({
      display_name: '새 이름',
      phone: null,
    });
    expect(mocks.updateEq).toHaveBeenCalledWith('id', CUSTOMER_ID);
  });

  test('preserves an existing phone when only the name changes', async () => {
    await updateCustomerProfile({
      customerId: CUSTOMER_ID,
      name: '새 이름',
    });
    expect(mocks.update).toHaveBeenCalledWith({
      display_name: '새 이름',
    });
  });

  test('rejects an invalid phone before sending an update', async () => {
    await expect(
      updateCustomerProfile({
        customerId: CUSTOMER_ID,
        name: '홍길동',
        phone: '010-1234',
      }),
    ).rejects.toBeDefined();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
