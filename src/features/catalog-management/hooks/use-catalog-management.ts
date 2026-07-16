import { useCatalogItemStore } from '@entities/catalog-item';
import { TCatalogItemCreateForm, TCatalogItemUpdateForm } from '../types';

export const useCatalogManagement = () => {
  const createItem = useCatalogItemStore((state) => state.createItem);
  const updateItem = useCatalogItemStore((state) => state.updateItem);
  const updateBasePrice = useCatalogItemStore((state) => state.updateBasePrice);

  const createCatalogItem = (input: TCatalogItemCreateForm) => createItem(input);
  const updateCatalogItem = (itemId: string, input: TCatalogItemUpdateForm) =>
    updateItem(itemId, input);
  const setCatalogItemActive = (itemId: string, isActive: boolean) =>
    updateItem(itemId, { isActive });

  return { createCatalogItem, updateCatalogItem, updateBasePrice, setCatalogItemActive };
};
