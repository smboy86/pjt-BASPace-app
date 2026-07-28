import { create } from 'zustand';
import {
  ERemodelRequestStatus,
  IRemodelRequest,
  TCreateRemodelRequestInput,
  TUpdateRemodelRequestInput,
} from '../types';

interface IRemodelRequestState {
  requests: IRemodelRequest[];
  hydrateRequests: (requests: IRemodelRequest[]) => void;
  clearRequests: () => void;
  addRequest: (request: IRemodelRequest) => void;
  createRequest: (input: TCreateRemodelRequestInput) => IRemodelRequest;
  updateRequest: (requestId: string, input: TUpdateRemodelRequestInput) => void;
  setStatus: (requestId: string, status: ERemodelRequestStatus) => void;
  getRequestById: (requestId: string) => IRemodelRequest | undefined;
}

const createId = () => `request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useRemodelRequestStore = create<IRemodelRequestState>((set, get) => ({
  requests: [],
  hydrateRequests: (requests) => {
    set((state) => {
      const localPhotosByRequestId = new Map(
        state.requests
          .filter((request) => request.photos.length > 0)
          .map((request) => [request.id, request.photos] as const),
      );

      return {
        requests: requests.map((request) => ({
          ...request,
          photos: localPhotosByRequestId.get(request.id) ?? request.photos,
        })),
      };
    });
  },
  clearRequests: () => {
    set({ requests: [] });
  },
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
