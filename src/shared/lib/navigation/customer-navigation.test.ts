import { beforeEach, describe, expect, it, vi } from 'vitest';
import { goBackOrCustomerQuotes } from './customer-navigation';

const routerMock = vi.hoisted(() => ({
  back: vi.fn(),
  canGoBack: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('expo-router', () => ({ router: routerMock }));

describe('goBackOrCustomerQuotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('이전 화면이 있으면 해당 화면으로 돌아간다', () => {
    routerMock.canGoBack.mockReturnValue(true);

    goBackOrCustomerQuotes();

    expect(routerMock.back).toHaveBeenCalledOnce();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('이전 화면이 없으면 나의견적 탭으로 이동한다', () => {
    routerMock.canGoBack.mockReturnValue(false);

    goBackOrCustomerQuotes();

    expect(routerMock.back).not.toHaveBeenCalled();
    expect(routerMock.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
