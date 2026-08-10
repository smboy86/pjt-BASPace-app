import { router } from 'expo-router';

export const CUSTOMER_HOME_PATH = '/(tabs)/home' as const;

export const goToCustomerHome = (): void => {
  router.replace(CUSTOMER_HOME_PATH);
};

export const goBackOrCustomerHome = (): void => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  goToCustomerHome();
};
