import { create } from 'zustand';
import { IConsultationMessage, ICreateConsultationMessageInput } from '../types';

interface IRequestConsultationState {
  messages: IConsultationMessage[];
  addMessage: (input: ICreateConsultationMessageInput) => IConsultationMessage;
  getMessagesByRequestId: (requestId: string) => IConsultationMessage[];
}

export const useRequestConsultationStore = create<IRequestConsultationState>((set, get) => ({
  messages: [],
  addMessage: (input) => {
    const message: IConsultationMessage = {
      ...input,
      id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
    return message;
  },
  getMessagesByRequestId: (requestId) =>
    get().messages.filter((message) => message.requestId === requestId),
}));
