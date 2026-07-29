import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignRemodelRequestPartner,
  fetchAssignablePartners,
} from './assign-remodel-request-partner.api';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

describe('assign remodel request partner api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: 'assignment-1', error: null });
  });

  it('loads approved partners with their representative labels', async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === 'partners') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () =>
                  Promise.resolve({
                    data: [
                      {
                        company_name: '바른욕실',
                        contact_name: '김대표',
                        id: 'partner-1',
                      },
                      {
                        company_name: '대표계정없음',
                        contact_name: '미연결',
                        id: 'partner-2',
                      },
                    ],
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [
                {
                  login_email: 'owner@example.com',
                  partner_id: 'partner-1',
                },
              ],
              error: null,
            }),
        }),
      };
    });

    await expect(fetchAssignablePartners()).resolves.toEqual([
      {
        companyName: '바른욕실',
        id: 'partner-1',
        representativeEmail: 'owner@example.com',
        representativeName: '김대표',
      },
    ]);
  });

  it('assigns the selected partner through the atomic administrator RPC', async () => {
    await expect(
      assignRemodelRequestPartner({
        partnerId: 'partner-1',
        requestId: 'request-1',
      }),
    ).resolves.toBe('assignment-1');

    expect(mocks.rpc).toHaveBeenCalledWith('assign_remodel_request_partner', {
      target_partner_id: 'partner-1',
      target_request_id: 'request-1',
    });
  });

  it('propagates assignment failures', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'request already assigned' },
    });

    await expect(
      assignRemodelRequestPartner({
        partnerId: 'partner-1',
        requestId: 'request-1',
      }),
    ).rejects.toMatchObject({ code: 'P0001' });
  });
});
