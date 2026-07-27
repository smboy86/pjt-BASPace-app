import type { ImagePickerAsset } from 'expo-image-picker';
import type { EQuoteOptionFormType } from '@/entities/quote-option';

export type TQuoteOptionEditableProductImage =
  | {
      key: string;
      kind: 'stored';
      storagePath: string;
      uri: string;
    }
  | {
      key: string;
      kind: 'new';
      asset: ImagePickerAsset;
      uri: string;
    };

export interface IQuoteOptionEditableProduct {
  id?: string;
  key: string;
  name: string;
  price: number;
  image: TQuoteOptionEditableProductImage | null;
}

export interface IUpdateQuoteOptionInput {
  optionId: string;
  name: string;
  displayOrder: number;
  formType: EQuoteOptionFormType;
  products: IQuoteOptionEditableProduct[];
}

export type TQuoteOptionManagementErrorCode =
  | 'cleanup_pending'
  | 'image_too_large'
  | 'missing_product_image'
  | 'unauthorized'
  | 'unsupported_image'
  | 'upload_failed'
  | 'validation_error'
  | 'unknown';

export class QuoteOptionManagementError extends Error {
  constructor(
    public readonly code: TQuoteOptionManagementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'QuoteOptionManagementError';
  }
}
