const CUSTOMER_ROOT_SEGMENTS = new Set(['explore', 'index', 'notifications', 'settings']);

export const isRoleRootPath = (segments: readonly string[]): boolean => {
  const [group, screen] = segments;

  if (group === '(tabs)') {
    return (
      segments.length === 1 || (segments.length === 2 && CUSTOMER_ROOT_SEGMENTS.has(screen ?? ''))
    );
  }

  return (
    segments.length === 2 &&
    ((group === '(partner)' && screen === 'dashboard') ||
      (group === '(admin)' && screen === 'dashboard'))
  );
};
