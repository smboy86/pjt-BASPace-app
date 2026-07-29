import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { DOUBLE_BACK_EXIT_WINDOW_MS, isSecondBackWithinWindow } from './double-back-exit-policy';
import { isRoleRootPath } from './role-root-path';

const EXIT_CONFIRMATION_MESSAGE = '한번 더 뒤로가기를 눌러 앱을 종료할 수 있어요';

export const useExitAppOnDoubleBack = (segments: readonly string[], enabled = true): void => {
  const lastBackPressAtRef = useRef<number | null>(null);
  const isRoleRoot = isRoleRootPath(segments);
  const routeKey = segments.join('/');

  useEffect(() => {
    lastBackPressAtRef.current = null;

    if (!enabled || Platform.OS !== 'android' || !isRoleRoot) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const now = Date.now();
      const lastBackPressAt = lastBackPressAtRef.current;

      if (isSecondBackWithinWindow(lastBackPressAt, now)) {
        Toast.hide();
        BackHandler.exitApp();
        return true;
      }

      lastBackPressAtRef.current = now;
      Toast.show({
        type: 'info',
        text1: EXIT_CONFIRMATION_MESSAGE,
        visibilityTime: DOUBLE_BACK_EXIT_WINDOW_MS,
        autoHide: true,
        position: 'bottom',
      });

      return true;
    });

    return () => {
      lastBackPressAtRef.current = null;
      subscription.remove();
    };
  }, [enabled, isRoleRoot, routeKey]);
};
