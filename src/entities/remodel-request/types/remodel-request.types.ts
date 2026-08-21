export enum ERemodelRequestStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  QUOTE_ADJUSTMENT = 'quote_adjustment',
  MATCHED = 'matched',
  IN_CONSULTATION = 'in_consultation',
  FINAL_QUOTE_SENT = 'final_quote_sent',
  CONFIRMED = 'confirmed',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum ESelectionDecision {
  NOT_SELECTED = 'not_selected',
  CONSULTATION_REQUIRED = 'consultation_required',
  SELECTED = 'selected',
}

export enum ERemodelScope {
  PARTIAL = 'partial',
  FULL = 'full',
}

export enum ERemodelBudgetCode {
  KRW_150_200 = 'KRW_150_200',
  KRW_200_300 = 'KRW_200_300',
  KRW_300_500 = 'KRW_300_500',
  CONSULTATION = 'CONSULTATION',
}

export const REMODEL_BUDGET_OPTIONS = [
  { code: ERemodelBudgetCode.KRW_150_200, label: '150~200만원' },
  { code: ERemodelBudgetCode.KRW_200_300, label: '200~300만원' },
  { code: ERemodelBudgetCode.KRW_300_500, label: '300~500만원' },
  { code: ERemodelBudgetCode.CONSULTATION, label: '견적 협의' },
] as const;

export const getRemodelBudgetLabel = (code: ERemodelBudgetCode): string =>
  REMODEL_BUDGET_OPTIONS.find((option) => option.code === code)?.label ?? code;

export interface IRequestPhoto {
  id: string;
  displayUri?: string;
  localUri?: string;
  storagePath?: string;
  mimeType?: string;
  sizeBytes?: number;
  category: string;
  sortOrder: number;
  createdAt: string;
}

export interface ISelectionSnapshot {
  id: string;
  category: string;
  catalogItemId?: string;
  itemName?: string;
  selectedOptionIds: string[];
  selectedOptionNames: string[];
  tileSize?: string;
  basePriceSnapshot?: number;
  decisionStatus: ESelectionDecision;
}

export interface IRemodelRequestScheduleChange {
  id: string;
  requestId: string;
  previousSchedule: string;
  newSchedule: string;
  changedBy: string;
  changedAt: string;
}

export interface IRemodelRequest {
  id: string;
  customerId: string;
  status: ERemodelRequestStatus;
  region: string;
  addressDetail: string;
  housingType: string;
  bathroomType: string;
  bathroomWidth: number;
  bathroomLength: number;
  bathroomHeight: number;
  estimatedSize?: string;
  hasBathtub?: boolean;
  requiresDemolition?: boolean;
  demolitionCostSnapshotManwon?: number;
  specialStructureNote?: string;
  budgetRange: ERemodelBudgetCode;
  desiredSchedule: string;
  customerDesiredSchedule: string;
  latestScheduleChange?: IRemodelRequestScheduleChange;
  scope: ERemodelScope;
  priorities: string[];
  notes: string;
  photos: IRequestPhoto[];
  selections: ISelectionSnapshot[];
  adjustedEstimateAmount?: number;
  adjustedEstimateReason?: string;
  adjustedBy?: string;
  adjustedAt?: string;
  adjustmentConfirmedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TCreateRemodelRequestInput = Omit<
  IRemodelRequest,
  | 'id'
  | 'status'
  | 'adjustedEstimateAmount'
  | 'adjustedEstimateReason'
  | 'adjustedBy'
  | 'adjustedAt'
  | 'adjustmentConfirmedAt'
  | 'latestScheduleChange'
  | 'submittedAt'
  | 'createdAt'
  | 'updatedAt'
>;

export type TUpdateRemodelRequestInput = Partial<
  Omit<IRemodelRequest, 'id' | 'customerId' | 'createdAt'>
>;
