import { describe, expect, it } from 'vitest';
import type { Database } from '@/shared/supabase';
import { ERemodelRequestStatus } from '../types';
import { mapRemodelRequest, mapSelectionSnapshot } from './remodel-request.mapper';

const REQUEST_ROW: Database['public']['Tables']['remodel_requests']['Row'] = {
  address_detail: '101동 101호',
  adjusted_at: '2026-07-28T12:00:00.000Z',
  adjusted_by: 'admin-1',
  adjusted_estimate_amount: 3_500_000,
  adjustment_confirmed_at: null,
  bathroom_type: '공용 욕실',
  budget_range: 'KRW_300_500',
  created_at: '2026-07-28T10:00:00.000Z',
  customer_id: 'customer-1',
  desired_schedule: '2개월 이내',
  estimated_size: '약 3㎡',
  has_bathtub: false,
  housing_type: '아파트',
  id: 'request-1',
  notes: '',
  priorities: [],
  region: '서울시 중구',
  requires_demolition: true,
  scope: 'full',
  special_structure_note: null,
  status: 'quote_adjustment',
  submitted_at: '2026-07-28T10:00:00.000Z',
  updated_at: '2026-07-28T12:00:00.000Z',
};

const SELECTION_ROW: Database['public']['Tables']['selection_snapshots']['Row'] = {
  base_price_snapshot: 1_250_000,
  catalog_item_id: null,
  category: '세면대',
  created_at: '2026-07-28T10:00:00.000Z',
  decision_status: 'selected',
  id: 'selection-1',
  item_name: '벽걸이 세면대',
  request_id: 'request-1',
  selected_options: [
    {
      productId: 'product-1',
      productName: '벽걸이 세면대',
    },
  ],
};

describe('remodel request mapper', () => {
  it('maps the persisted adjustment state and amount without changing their meaning', () => {
    const selection = mapSelectionSnapshot(SELECTION_ROW);
    const request = mapRemodelRequest(REQUEST_ROW, [selection]);

    expect(request).toEqual(
      expect.objectContaining({
        adjustedAt: '2026-07-28T12:00:00.000Z',
        adjustedBy: 'admin-1',
        adjustedEstimateAmount: 3_500_000,
        adjustmentConfirmedAt: undefined,
        status: ERemodelRequestStatus.QUOTE_ADJUSTMENT,
      }),
    );
    expect(request.selections[0]?.basePriceSnapshot).toBe(1_250_000);
  });

  it('maps a declined final assignment request to the cancelled domain status', () => {
    const request = mapRemodelRequest(
      {
        ...REQUEST_ROW,
        status: 'cancelled',
      },
      [],
    );

    expect(request.status).toBe(ERemodelRequestStatus.CANCELLED);
  });
});
