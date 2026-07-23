import {
  ERemodelRequestStatus,
  IRemodelRequest,
  TCreateRemodelRequestInput,
  useRemodelRequestStore,
} from '@entities/remodel-request';
import { IRemodelRequestValidationResult, TRemodelRequestDraftUpdate } from '../types';

const validateRequest = (request: IRemodelRequest): IRemodelRequestValidationResult => {
  const errors: string[] = [];

  if (!request.region) errors.push('공사 지역을 선택해 주세요.');
  if (!request.housingType) errors.push('주거 형태를 선택해 주세요.');
  if (!request.bathroomType) errors.push('욕실 유형을 선택해 주세요.');
  if (!request.budgetRange) errors.push('희망 예산을 선택해 주세요.');
  if (!request.desiredSchedule) errors.push('희망 시기를 선택해 주세요.');

  return { isValid: errors.length === 0, errors };
};

export const useCreateRemodelRequest = () => {
  const createRequest = useRemodelRequestStore((state) => state.createRequest);
  const updateRequest = useRemodelRequestStore((state) => state.updateRequest);
  const getRequestById = useRemodelRequestStore((state) => state.getRequestById);

  const saveDraft = (input: TCreateRemodelRequestInput) => createRequest(input);

  const updateDraft = (requestId: string, input: TRemodelRequestDraftUpdate) => {
    const request = getRequestById(requestId);
    if (!request || request.status !== ERemodelRequestStatus.DRAFT) return false;

    updateRequest(requestId, input);
    return true;
  };

  const submitRequest = (requestId: string): IRemodelRequestValidationResult => {
    const request = getRequestById(requestId);
    if (!request) return { isValid: false, errors: ['견적 요청을 찾을 수 없습니다.'] };

    const result = validateRequest(request);
    if (!result.isValid) return result;

    updateRequest(requestId, {
      status: ERemodelRequestStatus.SUBMITTED,
      submittedAt: new Date().toISOString(),
    });
    return result;
  };

  return { saveDraft, updateDraft, submitRequest, validateRequest };
};
