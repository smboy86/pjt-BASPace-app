import { describe, expect, it } from 'vitest';
import { ESelectionDecision } from '../types';
import { getDemolitionCostAmount, getRemodelRequestBaseEstimate } from './remodel-request-estimate';

const selections = [
  {
    basePriceSnapshot: 500_000,
    category: '타일',
    decisionStatus: ESelectionDecision.SELECTED,
    id: 'selection-1',
    selectedOptionIds: ['product-1'],
    selectedOptionNames: ['타일 제품'],
  },
];

describe('remodel request estimate', () => {
  it('converts the demolition snapshot from manwon and adds it once', () => {
    const request = {
      demolitionCostSnapshotManwon: 150,
      requiresDemolition: true,
      selections,
    };

    expect(getDemolitionCostAmount(request)).toBe(1_500_000);
    expect(getRemodelRequestBaseEstimate(request)).toBe(2_000_000);
  });

  it('does not add a construction type cost for overlay work', () => {
    expect(
      getRemodelRequestBaseEstimate({
        demolitionCostSnapshotManwon: undefined,
        requiresDemolition: false,
        selections,
      }),
    ).toBe(500_000);
  });
});
