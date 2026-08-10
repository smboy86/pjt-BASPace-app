import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { goBackOrCustomerQuotes } from '../navigation';

export const useCustomerBackFallback = (segments: readonly string[]): void => {
  const [group, screen] = segments;
  const isCustomerRoute = group === '(tabs)';
  const isQuotesRoot =
    isCustomerRoute && (segments.length === 1 || (segments.length === 2 && screen === 'index'));
  const routeKey = segments.join('/');

  useEffect(() => {
    if (Platform.OS !== 'android' || !isCustomerRoute || isQuotesRoot) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBackOrCustomerQuotes();
      return true;
    });

    return () => subscription.remove();
  }, [isCustomerRoute, isQuotesRoot, routeKey]);
};
