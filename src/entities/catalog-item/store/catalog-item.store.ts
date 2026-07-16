import { create } from 'zustand';
import {
  ICatalogItem,
  IPriceChange,
  TCreateCatalogItemInput,
  TUpdateCatalogItemInput,
} from '../types';

interface ICatalogItemState {
  items: ICatalogItem[];
  createItem: (input: TCreateCatalogItemInput) => ICatalogItem;
  updateItem: (itemId: string, input: TUpdateCatalogItemInput) => void;
  updateBasePrice: (itemId: string, price: number, changedBy: string) => void;
  getActiveItems: () => ICatalogItem[];
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useCatalogItemStore = create<ICatalogItemState>((set, get) => ({
  items: [],
  createItem: (input) => {
    const now = new Date().toISOString();
    const item: ICatalogItem = {
      ...input,
      id: createId('catalog'),
      priceHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ items: [...state.items, item] }));
    return item;
  },
  updateItem: (itemId, input) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, ...input, updatedAt: new Date().toISOString() } : item,
      ),
    }));
  },
  updateBasePrice: (itemId, price, changedBy) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) return item;

        const history: IPriceChange = {
          id: createId('price-change'),
          previousPrice: item.basePrice,
          nextPrice: price,
          changedBy,
          changedAt: new Date().toISOString(),
        };
        return {
          ...item,
          basePrice: price,
          priceHistory: [...item.priceHistory, history],
          updatedAt: history.changedAt,
        };
      }),
    }));
  },
  getActiveItems: () => get().items.filter((item) => item.isActive),
}));
