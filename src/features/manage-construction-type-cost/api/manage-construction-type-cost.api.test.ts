import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseClient } from '@/shared/supabase';
import {
  fetchDemolitionCostSetting,
  updateDemolitionCostSetting,
} from './manage-construction-type-cost.api';

vi.mock('@/shared/supabase', () => ({ getSupabaseClient: vi.fn() }));

describe('manage construction type cost api', () => {
  const rpc = vi.fn();
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);
  });

  it('maps the demolition setting stored in manwon units', async () => {
    single.mockResolvedValue({
      data: {
        amount_manwon: 150,
        code: 'DEMOLITION',
        updated_at: '2026-08-18T00:00:00.000Z',
        updated_by: 'admin-1',
      },
      error: null,
    });

    await expect(fetchDemolitionCostSetting()).resolves.toEqual({
      amountManwon: 150,
      code: 'DEMOLITION',
      updatedAt: '2026-08-18T00:00:00.000Z',
      updatedBy: 'admin-1',
    });
    expect(from).toHaveBeenCalledWith('construction_type_cost_settings');
    expect(eq).toHaveBeenCalledWith('code', 'DEMOLITION');
  });

  it('passes a manwon-unit integer to the admin update RPC', async () => {
    rpc.mockResolvedValue({ error: null });

    await updateDemolitionCostSetting({ amountManwon: 175 });

    expect(rpc).toHaveBeenCalledWith('update_demolition_cost_setting', {
      target_amount_manwon: 175,
    });
  });
});
