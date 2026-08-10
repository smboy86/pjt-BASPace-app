import { router } from 'expo-router';

export const goBackOrCustomerQuotes = (): void => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/(tabs)');
};
