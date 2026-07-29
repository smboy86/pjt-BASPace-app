const REMODEL_REQUEST_QUERY_KEY = ['remodel-requests'] as const;

export const remodelRequestQueryKeys = {
  all: REMODEL_REQUEST_QUERY_KEY,
  admin: [...REMODEL_REQUEST_QUERY_KEY, 'admin'] as const,
  partner: [...REMODEL_REQUEST_QUERY_KEY, 'partner'] as const,
  partnerDetail: (requestId: string) =>
    [...REMODEL_REQUEST_QUERY_KEY, 'partner', 'detail', requestId] as const,
  customer: (customerId: string) => [...REMODEL_REQUEST_QUERY_KEY, 'customer', customerId] as const,
  detail: (requestId: string) => [...REMODEL_REQUEST_QUERY_KEY, 'detail', requestId] as const,
};
