import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERemodelRequestStatus } from '../../../entities/remodel-request/types';
import { completeRemodelRequest } from './complete-remodel-request.repository';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    rpc: mocks.rpc,
  }),
}));

vi.mock('@/entities/remodel-request', () => ({
  ERemodelRequestStatus: {
    CLOSED: 'closed',
    IN_CONSULTATION: 'in_consultation',
  },
}));

describe('complete remodel request repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes an in-progress request through the server RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: ERemodelRequestStatus.CLOSED,
      error: null,
    });

    await expect(completeRemodelRequest('request-1')).resolves.toBe(ERemodelRequestStatus.CLOSED);
    expect(mocks.rpc).toHaveBeenCalledWith('complete_remodel_request', {
      target_request_id: 'request-1',
    });
  });

  it('propagates permission and state errors returned by the server', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Only an in-progress request can be completed.' },
    });

    await expect(completeRemodelRequest('request-1')).rejects.toMatchObject({
      code: 'P0001',
    });
  });

  it('rejects an unexpected completion result', async () => {
    mocks.rpc.mockResolvedValue({
      data: ERemodelRequestStatus.IN_CONSULTATION,
      error: null,
    });

    await expect(completeRemodelRequest('request-1')).rejects.toThrow(
      'Unexpected remodel request completion status.',
    );
  });
});
