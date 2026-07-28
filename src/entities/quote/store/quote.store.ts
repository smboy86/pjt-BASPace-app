import { create } from 'zustand';
import { EQuoteStatus, IQuote, TCreateQuoteInput } from '../types';

interface IQuoteState {
  quotes: IQuote[];
  clearQuotes: () => void;
  createQuote: (input: TCreateQuoteInput) => IQuote;
  sendQuote: (quoteId: string, isFinal: boolean) => void;
  confirmQuote: (quoteId: string) => void;
  getQuotesByRequestId: (requestId: string) => IQuote[];
}

const createId = () => `quote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useQuoteStore = create<IQuoteState>((set, get) => ({
  quotes: [],
  clearQuotes: () => set({ quotes: [] }),
  createQuote: (input) => {
    const now = new Date().toISOString();
    const subtotal = input.lineItems.reduce((sum, lineItem) => sum + lineItem.amount, 0);
    const tax = input.taxIncluded ? 0 : Math.round((subtotal - input.discount) * 0.1);
    const existingVersions = get().quotes.filter(
      (quote) => quote.requestId === input.requestId && quote.partnerId === input.partnerId,
    );
    const quote: IQuote = {
      ...input,
      id: createId(),
      version: existingVersions.length + 1,
      status: EQuoteStatus.DRAFT,
      subtotal,
      tax,
      total: subtotal - input.discount + tax,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ quotes: [...state.quotes, quote] }));
    return quote;
  },
  sendQuote: (quoteId, isFinal) => {
    set((state) => ({
      quotes: state.quotes.map((quote) =>
        quote.id === quoteId
          ? {
              ...quote,
              status: isFinal ? EQuoteStatus.FINAL : EQuoteStatus.SENT,
              sentAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : quote,
      ),
    }));
  },
  confirmQuote: (quoteId) => {
    set((state) => ({
      quotes: state.quotes.map((quote) =>
        quote.id === quoteId
          ? { ...quote, status: EQuoteStatus.CONFIRMED, updatedAt: new Date().toISOString() }
          : quote,
      ),
    }));
  },
  getQuotesByRequestId: (requestId) =>
    get().quotes.filter((quote) => quote.requestId === requestId),
}));
