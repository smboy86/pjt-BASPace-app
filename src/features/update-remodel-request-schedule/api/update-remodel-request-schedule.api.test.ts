import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseClient } from '@/shared/supabase';
import { updateRemodelRequestSchedule } from './update-remodel-request-schedule.api';

vi.mock('@/shared/supabase', () => ({ getSupabaseClient: vi.fn() }));

describe('updateRemodelRequestSchedule', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseClient).mockReturnValue({ rpc } as never);
  });

  it('관리자 날짜 변경 RPC에 요청 ID와 날짜를 전달한다', async () => {
    rpc.mockResolvedValue({ error: null });

    await updateRemodelRequestSchedule({
      requestId: 'request-1',
      desiredSchedule: '2026-08-20',
    });

    expect(rpc).toHaveBeenCalledWith('update_remodel_request_schedule', {
      target_date: '2026-08-20',
      target_request_id: 'request-1',
    });
  });

  it('RPC 오류를 호출자에게 전달한다', async () => {
    const error = new Error('denied');
    rpc.mockResolvedValue({ error });

    await expect(
      updateRemodelRequestSchedule({
        requestId: 'request-1',
        desiredSchedule: '2026-08-20',
      }),
    ).rejects.toBe(error);
  });
});
