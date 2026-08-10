import { describe, expect, it } from 'vitest';
import { isCustomerHomePath, isCustomerPrimaryTabRootPath, isRoleRootPath } from './role-root-path';

describe('isRoleRootPath', () => {
  it.each([
    [['(tabs)'], false],
    [['(tabs)', 'home'], true],
    [['(tabs)', 'index'], false],
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

  it.each([
    [['(tabs)'], false],
    [['(tabs)', 'home'], true],
    [['(tabs)', 'index'], false],
    [['(tabs)', 'request', 'request-id'], false],
  ] as const)('%j 경로의 고객 홈 여부는 %s이다', (segments, expected) => {
    expect(isCustomerHomePath(segments)).toBe(expected);
  });

  it.each([
    [['(tabs)', 'explore'], true],
    [['(tabs)', 'index'], true],
    [['(tabs)', 'home'], true],
    [['(tabs)', 'notifications'], true],
    [['(tabs)', 'settings'], true],
    [['(tabs)'], true],
    [['(tabs)', 'account'], false],
    [['(tabs)', 'request', 'request-id'], false],
    [['(admin)', 'dashboard'], false],
  ] as const)('%j 경로의 고객 기본 탭 루트 여부는 %s이다', (segments, expected) => {
    expect(isCustomerPrimaryTabRootPath(segments)).toBe(expected);
  });
});
