import { describe, expect, it } from 'vitest';
import { isRoleRootPath } from './role-root-path';

describe('isRoleRootPath', () => {
  it.each([
    [['(tabs)'], true],
    [['(tabs)', 'index'], true],
    [['(tabs)', 'explore'], false],
    [['(tabs)', 'notifications'], false],
    [['(tabs)', 'settings'], false],
    [['(partner)', 'dashboard'], true],
    [['(admin)', 'dashboard'], true],
    [['(tabs)', 'request', 'request-id'], false],
    [['(tabs)', 'account'], false],
    [['(partner)', 'requests'], false],
    [['(admin)', 'requests'], false],
    [['(auth)', 'login'], false],
  ] as const)('%j 경로의 루트 여부는 %s이다', (segments, expected) => {
    expect(isRoleRootPath(segments)).toBe(expected);
  });
});
