const CUSTOMER_PRIMARY_TABS = new Set(['explore', 'index', 'home', 'notifications', 'settings']);

export const isCustomerHomePath = (segments: readonly string[]): boolean => {
  const [group, screen] = segments;

  return group === '(tabs)' && segments.length === 2 && screen === 'home';
};

export const isCustomerPrimaryTabRootPath = (segments: readonly string[]): boolean => {
  const [group, screen] = segments;

  return (
    group === '(tabs)' &&
    (segments.length === 1 || (segments.length === 2 && CUSTOMER_PRIMARY_TABS.has(screen ?? '')))
  );
};

export const isRoleRootPath = (segments: readonly string[]): boolean => {
  const [group, screen] = segments;

  if (group === '(tabs)') {
    return isCustomerHomePath(segments);
  }

  return (
    segments.length === 2 &&
    ((group === '(partner)' && screen === 'dashboard') ||
      (group === '(admin)' && screen === 'dashboard'))
  );
};
