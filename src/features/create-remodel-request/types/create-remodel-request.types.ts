import type {
  ERemodelBudgetCode,
  IRequestPhoto,
  TCreateRemodelRequestInput,
  TUpdateRemodelRequestInput,
} from '@entities/remodel-request';
import type { TQuoteOptionTileSize } from '@/entities/quote-option';

export type TRemodelRequestFormValues = TCreateRemodelRequestInput;

export interface IRemodelRequestValidationResult {
  isValid: boolean;
  errors: string[];
}

export type TRemodelRequestDraftUpdate = TUpdateRemodelRequestInput;

export interface ISelectedQuoteProductSubmission {
  optionCode: string;
  optionId: string;
  optionName: string;
  productId: string;
  productName: string;
  price: number;
  tileSize?: TQuoteOptionTileSize;
}

export interface ISubmitRemodelRequestInput {
  addressDetail: string;
  bathroomHeight: number;
  bathroomLength: number;
  bathroomWidth: number;
  budgetCode: ERemodelBudgetCode;
  customerId: string;
  desiredConstructionDate: string;
  notes: string;
  photos: IRequestPhoto[];
  region: string;
  requiresDemolition: boolean;
  selections: ISelectedQuoteProductSubmission[];
}
