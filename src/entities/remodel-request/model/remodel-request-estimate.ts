import type { IRemodelRequest } from '../types';

export const MANWON_IN_WON = 10_000;

export const getDemolitionCostAmount = (
  request: Pick<IRemodelRequest, 'demolitionCostSnapshotManwon' | 'requiresDemolition'>,
): number =>
  request.requiresDemolition === true
    ? (request.demolitionCostSnapshotManwon ?? 0) * MANWON_IN_WON
    : 0;

export const getRemodelRequestBaseEstimate = (
  request: Pick<
    IRemodelRequest,
    'demolitionCostSnapshotManwon' | 'requiresDemolition' | 'selections'
  >,
): number =>
  request.selections.reduce(
    (sum, selection) => sum + (selection.basePriceSnapshot ?? 0),
    getDemolitionCostAmount(request),
  );
