export const getRemovedStoragePaths = (
  previousPaths: string[],
  retainedPaths: string[],
): string[] => {
  const retained = new Set(retainedPaths);
  return previousPaths.filter((path) => !retained.has(path));
};

export const getUploadCleanupPaths = (
  databaseUpdated: boolean,
  uploadedPaths: string[],
): string[] => (databaseUpdated ? [] : uploadedPaths);
