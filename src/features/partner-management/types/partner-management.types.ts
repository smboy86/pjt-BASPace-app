import type { ImagePickerAsset } from 'expo-image-picker';

export interface ICreatePartnerForm {
  companyName: string;
  businessNumber: string;
  representativeEmail: string;
  password: string;
  contactName: string;
  contactPhone: string;
  note: string;
}

export interface ICreatePartnerInput extends ICreatePartnerForm {
  businessRegistrationImage: ImagePickerAsset | null;
}

export type TPartnerManagementErrorCode =
  | 'duplicate_business_number'
  | 'email_already_registered'
  | 'image_too_large'
  | 'invalid_email'
  | 'unsupported_image'
  | 'upload_failed'
  | 'unauthorized'
  | 'validation_error'
  | 'weak_password'
  | 'unknown';

export interface IPartnerWorkspace {
  partnerId: string;
  companyName: string;
  isManager: boolean;
}

export class PartnerManagementError extends Error {
  constructor(
    public readonly code: TPartnerManagementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PartnerManagementError';
  }
}
