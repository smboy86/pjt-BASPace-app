import { getSupabaseClient } from '@/shared/supabase';
import type { IAdjustRemodelRequestQuoteInput } from '../types';

export const adjustRemodelRequestQuote = async (
  input: IAdjustRemodelRequestQuoteInput,
): Promise<void> => {
  const { error } = await getSupabaseClient().rpc('adjust_customer_request_quote', {
    target_amount: input.amount,
    target_request_id: input.requestId,
  });

  if (error) throw error;
};

export const confirmAdjustedRemodelRequestQuote = async (requestId: string): Promise<void> => {
  const { error } = await getSupabaseClient().rpc('confirm_adjusted_request_quote', {
    target_request_id: requestId,
  });

  if (error) throw error;
};
