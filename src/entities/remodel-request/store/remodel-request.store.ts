import { create } from 'zustand';
import {
  ERemodelRequestStatus,
  IRemodelRequest,
  TCreateRemodelRequestInput,
  TUpdateRemodelRequestInput,
} from '../types';

interface IRemodelRequestState {
  requests: IRemodelRequest[];
  addRequest: (request: IRemodelRequest) => void;
  createRequest: (input: TCreateRemodelRequestInput) => IRemodelRequest;
  updateRequest: (requestId: string, input: TUpdateRemodelRequestInput) => void;
  setStatus: (requestId: string, status: ERemodelRequestStatus) => void;
  getRequestById: (requestId: string) => IRemodelRequest | undefined;
}

const createId = () => `request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useRemodelRequestStore = create<IRemodelRequestState>((set, get) => ({
  requests: [],
  addRequest: (request) => {
    set((state) => ({
      requests: [...state.requests.filter((item) => item.id !== request.id), request],
    }));
  },
  createRequest: (input) => {
    const now = new Date().toISOString();
    const request: IRemodelRequest = {
      ...input,
      id: createId(),
      status: ERemodelRequestStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ requests: [...state.requests, request] }));
    return request;
  },
  updateRequest: (requestId, input) => {
    set((state) => ({
      requests: state.requests.map((request) =>
        request.id === requestId
          ? { ...request, ...input, updatedAt: new Date().toISOString() }
          : request,
      ),
    }));
  },
  setStatus: (requestId, status) => {
    get().updateRequest(requestId, { status });
  },
  getRequestById: (requestId) => get().requests.find((request) => request.id === requestId),
}));
