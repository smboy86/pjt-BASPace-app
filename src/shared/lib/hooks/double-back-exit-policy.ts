export const DOUBLE_BACK_EXIT_WINDOW_MS = 2_000;

export const isSecondBackWithinWindow = (
  lastBackPressAt: number | null,
  currentBackPressAt: number,
): boolean => {
  if (lastBackPressAt === null) return false;

  const elapsedTime = currentBackPressAt - lastBackPressAt;
  return elapsedTime >= 0 && elapsedTime <= DOUBLE_BACK_EXIT_WINDOW_MS;
};
