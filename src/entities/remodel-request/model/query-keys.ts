const REMODEL_REQUEST_QUERY_KEY = ['remodel-requests'] as const;

export const remodelRequestQueryKeys = {
  all: REMODEL_REQUEST_QUERY_KEY,
  customer: (customerId: string) => [...REMODEL_REQUEST_QUERY_KEY, 'customer', customerId] as const,
};
