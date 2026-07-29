import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adjustRemodelRequestQuote,
  confirmAdjustedRemodelRequestQuote,
} from './adjust-remodel-request-quote.api';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/shared/supabase', () => ({
  getSupabaseClient: () => ({
    rpc: mocks.rpc,
  }),
}));

describe('adjust remodel request quote api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: undefined, error: null });
  });

  it('sends the adjusted amount through the administrator RPC', async () => {
    await adjustRemodelRequestQuote({ requestId: 'request-1', amount: 3_500_000 });

    expect(mocks.rpc).toHaveBeenCalledWith('adjust_customer_request_quote', {
      target_amount: 3_500_000,
      target_request_id: 'request-1',
    });
  });

  it('confirms the adjusted quote through the customer RPC', async () => {
    await confirmAdjustedRemodelRequestQuote('request-1');

    expect(mocks.rpc).toHaveBeenCalledWith('confirm_adjusted_request_quote', {
      target_request_id: 'request-1',
    });
  });
});
