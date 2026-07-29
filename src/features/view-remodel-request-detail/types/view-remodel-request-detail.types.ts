import type { IRemodelRequest } from '@/entities/remodel-request';

export interface IRemodelRequestDetail {
  request: IRemodelRequest;
  customerName: string;
}
