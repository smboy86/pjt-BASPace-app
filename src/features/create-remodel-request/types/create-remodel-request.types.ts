import type {
  ERemodelBudgetCode,
  IRequestPhoto,
  TCreateRemodelRequestInput,
  TUpdateRemodelRequestInput,
} from '@entities/remodel-request';

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
}

export interface ISubmitRemodelRequestInput {
  addressDetail: string;
  budgetCode: ERemodelBudgetCode;
  customerId: string;
  notes: string;
  photos: IRequestPhoto[];
  region: string;
  selections: ISelectedQuoteProductSubmission[];
}
