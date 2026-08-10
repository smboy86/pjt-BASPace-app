import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { goBackOrCustomerHome, goToCustomerHome } from '../navigation';
import { isCustomerHomePath, isCustomerPrimaryTabRootPath } from './role-root-path';

export const useCustomerBackFallback = (segments: readonly string[]): void => {
  const [group] = segments;
  const isCustomerRoute = group === '(tabs)';
  const isCustomerHome = isCustomerHomePath(segments);
  const isPrimaryTabRoot = isCustomerPrimaryTabRootPath(segments);
  const routeKey = segments.join('/');

  useEffect(() => {
    if (Platform.OS !== 'android' || !isCustomerRoute || isCustomerHome) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isPrimaryTabRoot) {
        goToCustomerHome();
      } else {
        goBackOrCustomerHome();
      }
      return true;
    });

    return () => subscription.remove();
  }, [isCustomerHome, isCustomerRoute, isPrimaryTabRoot, routeKey]);
};
