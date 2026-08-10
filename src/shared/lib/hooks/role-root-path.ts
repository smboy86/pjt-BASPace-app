export const isRoleRootPath = (segments: readonly string[]): boolean => {
  const [group, screen] = segments;

  if (group === '(tabs)') {
    return segments.length === 1 || (segments.length === 2 && screen === 'index');
  }

  return (
    segments.length === 2 &&
    ((group === '(partner)' && screen === 'dashboard') ||
      (group === '(admin)' && screen === 'dashboard'))
  );
};
