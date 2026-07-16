import type {
  TCreateRemodelRequestInput,
  TUpdateRemodelRequestInput,
} from '@entities/remodel-request';

export type TRemodelRequestFormValues = TCreateRemodelRequestInput;

export interface IRemodelRequestValidationResult {
  isValid: boolean;
  errors: string[];
}

export type TRemodelRequestDraftUpdate = TUpdateRemodelRequestInput;
