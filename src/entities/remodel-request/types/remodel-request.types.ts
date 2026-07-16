export enum ERemodelRequestStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  MATCHED = 'matched',
  IN_CONSULTATION = 'in_consultation',
  FINAL_QUOTE_SENT = 'final_quote_sent',
  CONFIRMED = 'confirmed',
  CLOSED = 'closed',
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

export interface IRequestPhoto {
  id: string;
  localUri: string;
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
  basePriceSnapshot?: number;
  decisionStatus: ESelectionDecision;
}

export interface IRemodelRequest {
  id: string;
  customerId: string;
  status: ERemodelRequestStatus;
  region: string;
  housingType: string;
  bathroomType: string;
  estimatedSize?: string;
  hasBathtub?: boolean;
  requiresDemolition?: boolean;
  specialStructureNote?: string;
  budgetRange: string;
  desiredSchedule: string;
  scope: ERemodelScope;
  priorities: string[];
  notes: string;
  photos: IRequestPhoto[];
  selections: ISelectionSnapshot[];
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TCreateRemodelRequestInput = Omit<
  IRemodelRequest,
  'id' | 'status' | 'submittedAt' | 'createdAt' | 'updatedAt'
>;

export type TUpdateRemodelRequestInput = Partial<
  Omit<IRemodelRequest, 'id' | 'customerId' | 'createdAt'>
>;
