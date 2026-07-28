import { describe, expect, it, vi } from 'vitest';
import { ERemodelRequestStatus } from '../../../entities/remodel-request/types';
import { ADMIN_REQUEST_TABS, getAdminRequestTabId } from './admin-request-tabs';

vi.mock('@/entities/remodel-request', () => ({
  ERemodelRequestStatus: {
    CLOSED: 'closed',
    CONFIRMED: 'confirmed',
    DRAFT: 'draft',
    FINAL_QUOTE_SENT: 'final_quote_sent',
    IN_CONSULTATION: 'in_consultation',
    MATCHED: 'matched',
    SUBMITTED: 'submitted',
  },
}));

describe('admin request tabs', () => {
  it('maps every submitted request status to the approved four tabs', () => {
    expect(getAdminRequestTabId(ERemodelRequestStatus.SUBMITTED)).toBe('new');
    expect(getAdminRequestTabId(ERemodelRequestStatus.MATCHED)).toBe('assigned');
    expect(getAdminRequestTabId(ERemodelRequestStatus.IN_CONSULTATION)).toBe('in_progress');
    expect(getAdminRequestTabId(ERemodelRequestStatus.FINAL_QUOTE_SENT)).toBe('in_progress');
    expect(getAdminRequestTabId(ERemodelRequestStatus.CONFIRMED)).toBe('done');
    expect(getAdminRequestTabId(ERemodelRequestStatus.CLOSED)).toBe('done');
  });

  it('excludes draft requests and keeps the approved tab order', () => {
    expect(getAdminRequestTabId(ERemodelRequestStatus.DRAFT)).toBeNull();
    expect(ADMIN_REQUEST_TABS.map((tab) => tab.label)).toEqual([
      '신규 견적',
      '배정 완료',
      '견적 진행',
      '완료·종료',
    ]);
  });
});
