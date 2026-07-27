import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IQuoteOption } from '@/entities/quote-option';
import { fetchQuoteOption, fetchQuoteOptions, updateQuoteOption } from '../api';

const QUOTE_OPTIONS_QUERY_KEY = ['admin', 'quote-options'] as const;

export const useQuoteOptions = () =>
  useQuery({
    queryKey: QUOTE_OPTIONS_QUERY_KEY,
    queryFn: fetchQuoteOptions,
  });

export const useQuoteOption = (optionId: string) =>
  useQuery({
    queryKey: [...QUOTE_OPTIONS_QUERY_KEY, optionId],
    queryFn: () => fetchQuoteOption(optionId),
    enabled: Boolean(optionId),
  });

export const useUpdateQuoteOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateQuoteOption,
    onSuccess: async (option) => {
      queryClient.setQueryData<IQuoteOption>([...QUOTE_OPTIONS_QUERY_KEY, option.id], option);
      await queryClient.invalidateQueries({ queryKey: QUOTE_OPTIONS_QUERY_KEY });
    },
  });
};
