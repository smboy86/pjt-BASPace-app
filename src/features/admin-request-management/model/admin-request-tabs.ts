import { ERemodelRequestStatus } from '@/entities/remodel-request';
import type { IAdminRequestTab, TAdminRequestTabId } from '../types';

export const ADMIN_REQUEST_TABS: readonly IAdminRequestTab[] = [
  {
    id: 'new',
    label: '신규 견적',
    statuses: [ERemodelRequestStatus.SUBMITTED],
  },
  {
    id: 'adjustment',
    label: '견적 조율',
    statuses: [ERemodelRequestStatus.QUOTE_ADJUSTMENT],
  },
  {
    id: 'assigned',
    label: '배정 완료',
    statuses: [ERemodelRequestStatus.MATCHED],
  },
  {
    id: 'in_progress',
    label: '견적 진행',
    statuses: [ERemodelRequestStatus.IN_CONSULTATION, ERemodelRequestStatus.FINAL_QUOTE_SENT],
  },
  {
    id: 'done',
    label: '완료·종료',
    statuses: [
      ERemodelRequestStatus.CONFIRMED,
      ERemodelRequestStatus.CLOSED,
      ERemodelRequestStatus.CANCELLED,
    ],
  },
] as const;

export const getAdminRequestTabId = (status: ERemodelRequestStatus): TAdminRequestTabId | null => {
  const tab = ADMIN_REQUEST_TABS.find((candidate) => candidate.statuses.includes(status));
  return tab?.id ?? null;
};
