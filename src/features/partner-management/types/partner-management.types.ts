import type { ImagePickerAsset } from 'expo-image-picker';

export interface ICreatePartnerForm {
  companyName: string;
  businessNumber: string;
  contactName: string;
  contactPhone: string;
  note: string;
}

export interface ICreatePartnerInput extends ICreatePartnerForm {
  businessRegistrationImage: ImagePickerAsset | null;
}

export type TPartnerManagementErrorCode =
  | 'duplicate_business_number'
  | 'image_too_large'
  | 'unsupported_image'
  | 'upload_failed'
  | 'unknown';

export class PartnerManagementError extends Error {
  constructor(
    public readonly code: TPartnerManagementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PartnerManagementError';
  }
}
