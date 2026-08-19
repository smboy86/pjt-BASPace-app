import { describe, expect, it } from 'vitest';
import type { Database } from '@/shared/supabase';
import { ERemodelRequestStatus } from '../types';
import { mapRemodelRequest, mapSelectionSnapshot } from './remodel-request.mapper';

const REQUEST_ROW: Database['public']['Tables']['remodel_requests']['Row'] = {
  address_detail: '101동 101호',
  adjusted_at: '2026-07-28T12:00:00.000Z',
  adjusted_by: 'admin-1',
  adjusted_estimate_amount: 3_500_000,
  adjusted_estimate_reason: '자재 등급 변경을 반영했습니다.',
  adjustment_confirmed_at: null,
  bathroom_height: 2200,
  bathroom_length: 1800,
  bathroom_type: '공용 욕실',
  bathroom_width: 1600,
  budget_range: 'KRW_300_500',
  created_at: '2026-07-28T10:00:00.000Z',
  customer_id: 'customer-1',
  demolition_cost_snapshot_manwon: 150,
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
        adjustedEstimateReason: '자재 등급 변경을 반영했습니다.',
        adjustmentConfirmedAt: undefined,
        bathroomHeight: 2200,
        bathroomLength: 1800,
        bathroomWidth: 1600,
        customerDesiredSchedule: '2개월 이내',
        demolitionCostSnapshotManwon: 150,
        status: ERemodelRequestStatus.QUOTE_ADJUSTMENT,
      }),
    );
    expect(request.selections[0]?.basePriceSnapshot).toBe(1_250_000);
  });

  it('keeps the customer submitted schedule separate from the current admin schedule', () => {
    const request = mapRemodelRequest(REQUEST_ROW, [], undefined, '2026-08-18');

    expect(request.customerDesiredSchedule).toBe('2026-08-18');
    expect(request.desiredSchedule).toBe('2개월 이내');
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
