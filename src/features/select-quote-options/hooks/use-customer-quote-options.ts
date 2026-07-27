import { useQuery } from '@tanstack/react-query';
import { fetchCustomerQuoteOptions } from '../api';

const CUSTOMER_QUOTE_OPTIONS_QUERY_KEY = ['customer', 'quote-options'] as const;

export const useCustomerQuoteOptions = (enabled = true) =>
  useQuery({
    queryKey: CUSTOMER_QUOTE_OPTIONS_QUERY_KEY,
    queryFn: fetchCustomerQuoteOptions,
    enabled,
  });
