import type { Database, TJson } from '@/shared/supabase';
import {
  ERemodelBudgetCode,
  ERemodelRequestStatus,
  ERemodelScope,
  ESelectionDecision,
  type IRemodelRequest,
  type IRequestPhoto,
  type IRemodelRequestScheduleChange,
  type ISelectionSnapshot,
} from '../types';

type TRemodelRequestRow = Database['public']['Tables']['remodel_requests']['Row'];
type TSelectionSnapshotRow = Database['public']['Tables']['selection_snapshots']['Row'];
type TRequestPhotoRow = Database['public']['Tables']['request_photos']['Row'];
type TScheduleChangeRow = Database['public']['Tables']['remodel_request_schedule_changes']['Row'];
type TJsonObject = { [key: string]: TJson | undefined };

const isJsonObject = (value: TJson): value is TJsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const findStringValue = (value: TJsonObject, keys: readonly string[]): string | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string') return candidate;
  }

  return undefined;
};

const mapSelectedOptions = (
  selectedOptions: TJson,
): Pick<ISelectionSnapshot, 'selectedOptionIds' | 'selectedOptionNames' | 'tileSize'> => {
  if (!Array.isArray(selectedOptions)) {
    return { selectedOptionIds: [], selectedOptionNames: [] };
  }

  const selectedOptionIds: string[] = [];
  const selectedOptionNames: string[] = [];
  let tileSize: string | undefined;

  selectedOptions.forEach((selectedOption) => {
    if (typeof selectedOption === 'string') {
      selectedOptionIds.push(selectedOption);
      selectedOptionNames.push(selectedOption);
      return;
    }

    if (!isJsonObject(selectedOption)) return;

    const id = findStringValue(selectedOption, ['productId', 'optionId', 'id']);
    const name = findStringValue(selectedOption, ['productName', 'optionName', 'name', 'label']);
    tileSize ??= findStringValue(selectedOption, ['tileSize']);

    if (id) selectedOptionIds.push(id);
    if (name) selectedOptionNames.push(name);
  });

  return {
    selectedOptionIds: [...new Set(selectedOptionIds)],
    selectedOptionNames: [...new Set(selectedOptionNames)],
    tileSize,
  };
};

export const mapRemodelRequestStatus = (
  status: TRemodelRequestRow['status'],
): ERemodelRequestStatus => {
  switch (status) {
    case 'draft':
      return ERemodelRequestStatus.DRAFT;
    case 'submitted':
      return ERemodelRequestStatus.SUBMITTED;
    case 'quote_adjustment':
      return ERemodelRequestStatus.QUOTE_ADJUSTMENT;
    case 'matched':
      return ERemodelRequestStatus.MATCHED;
    case 'in_consultation':
      return ERemodelRequestStatus.IN_CONSULTATION;
    case 'final_quote_sent':
      return ERemodelRequestStatus.FINAL_QUOTE_SENT;
    case 'confirmed':
      return ERemodelRequestStatus.CONFIRMED;
    case 'closed':
      return ERemodelRequestStatus.CLOSED;
    case 'cancelled':
      return ERemodelRequestStatus.CANCELLED;
  }
};

const mapScope = (scope: TRemodelRequestRow['scope']): ERemodelScope => {
  switch (scope) {
    case 'partial':
      return ERemodelScope.PARTIAL;
    case 'full':
      return ERemodelScope.FULL;
  }
};

const mapBudgetRange = (budgetRange: string): ERemodelBudgetCode => {
  switch (budgetRange) {
    case ERemodelBudgetCode.KRW_150_200:
      return ERemodelBudgetCode.KRW_150_200;
    case ERemodelBudgetCode.KRW_200_300:
      return ERemodelBudgetCode.KRW_200_300;
    case ERemodelBudgetCode.KRW_300_500:
      return ERemodelBudgetCode.KRW_300_500;
    case ERemodelBudgetCode.CONSULTATION:
      return ERemodelBudgetCode.CONSULTATION;
    default:
      throw new Error(`Unsupported remodel request budget range: ${budgetRange}`);
  }
};

const mapDecisionStatus = (
  decisionStatus: TSelectionSnapshotRow['decision_status'],
): ESelectionDecision => {
  switch (decisionStatus) {
    case 'not_selected':
      return ESelectionDecision.NOT_SELECTED;
    case 'consultation_required':
      return ESelectionDecision.CONSULTATION_REQUIRED;
    case 'selected':
      return ESelectionDecision.SELECTED;
  }
};

export const mapSelectionSnapshot = (row: TSelectionSnapshotRow): ISelectionSnapshot => ({
  id: row.id,
  category: row.category,
  catalogItemId: row.catalog_item_id ?? undefined,
  itemName: row.item_name ?? undefined,
  ...mapSelectedOptions(row.selected_options),
  basePriceSnapshot: row.base_price_snapshot ?? undefined,
  decisionStatus: mapDecisionStatus(row.decision_status),
});

export const mapRemodelRequestScheduleChange = (
  row: TScheduleChangeRow,
): IRemodelRequestScheduleChange => ({
  id: row.id,
  requestId: row.request_id,
  previousSchedule: row.previous_schedule,
  newSchedule: row.new_schedule,
  changedBy: row.changed_by,
  changedAt: row.changed_at,
});

export const mapRequestPhoto = (row: TRequestPhotoRow, displayUri: string): IRequestPhoto => ({
  id: row.id,
  displayUri,
  storagePath: row.storage_path,
  mimeType: row.mime_type ?? undefined,
  sizeBytes: row.size_bytes ?? undefined,
  category: row.category,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
});

export const mapRemodelRequest = (
  row: TRemodelRequestRow,
  selections: ISelectionSnapshot[],
  latestScheduleChange?: IRemodelRequestScheduleChange,
  customerDesiredSchedule = row.desired_schedule,
  photos: IRequestPhoto[] = [],
): IRemodelRequest => ({
  id: row.id,
  customerId: row.customer_id,
  status: mapRemodelRequestStatus(row.status),
  region: row.region,
  addressDetail: row.address_detail,
  housingType: row.housing_type,
  bathroomType: row.bathroom_type,
  bathroomWidth: row.bathroom_width,
  bathroomLength: row.bathroom_length,
  bathroomHeight: row.bathroom_height,
  estimatedSize: row.estimated_size ?? undefined,
  hasBathtub: row.has_bathtub ?? undefined,
  requiresDemolition: row.requires_demolition ?? undefined,
  demolitionCostSnapshotManwon: row.demolition_cost_snapshot_manwon ?? undefined,
  specialStructureNote: row.special_structure_note ?? undefined,
  budgetRange: mapBudgetRange(row.budget_range),
  desiredSchedule: row.desired_schedule,
  customerDesiredSchedule,
  latestScheduleChange,
  scope: mapScope(row.scope),
  priorities: row.priorities,
  notes: row.notes,
  photos,
  selections,
  adjustedEstimateAmount: row.adjusted_estimate_amount ?? undefined,
  adjustedEstimateReason: row.adjusted_estimate_reason ?? undefined,
  adjustedBy: row.adjusted_by ?? undefined,
  adjustedAt: row.adjusted_at ?? undefined,
  adjustmentConfirmedAt: row.adjustment_confirmed_at ?? undefined,
  submittedAt: row.submitted_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
