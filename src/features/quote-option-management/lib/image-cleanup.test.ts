import { describe, expect, it } from 'vitest';
import { getRemovedStoragePaths, getUploadCleanupPaths } from './image-cleanup';

describe('quote option image cleanup decisions', () => {
  it('keeps images retained by the saved form', () => {
    expect(getRemovedStoragePaths(['option/a.jpg', 'option/b.jpg'], ['option/b.jpg'])).toEqual([
      'option/a.jpg',
    ]);
  });

  it('cleans partial uploads when the database update did not commit', () => {
    expect(getUploadCleanupPaths(false, ['option/new-1.jpg'])).toEqual(['option/new-1.jpg']);
  });

  it('preserves uploaded files after the database update committed', () => {
    expect(getUploadCleanupPaths(true, ['option/new-1.jpg'])).toEqual([]);
  });
});
