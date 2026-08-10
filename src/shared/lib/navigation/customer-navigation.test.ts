import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CUSTOMER_HOME_PATH, goBackOrCustomerHome, goToCustomerHome } from './customer-navigation';

const routerMock = vi.hoisted(() => ({
  back: vi.fn(),
  canGoBack: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('expo-router', () => ({ router: routerMock }));

describe('고객 홈 내비게이션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('이전 화면이 있으면 해당 화면으로 돌아간다', () => {
    routerMock.canGoBack.mockReturnValue(true);

    goBackOrCustomerHome();

    expect(routerMock.back).toHaveBeenCalledOnce();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('이전 화면이 없으면 고객 홈 탭으로 이동한다', () => {
    routerMock.canGoBack.mockReturnValue(false);

    goBackOrCustomerHome();

    expect(routerMock.back).not.toHaveBeenCalled();
    expect(routerMock.replace).toHaveBeenCalledWith(CUSTOMER_HOME_PATH);
  });

  it('고객 홈으로 직접 이동할 때 현재 이력을 교체한다', () => {
    goToCustomerHome();

    expect(routerMock.replace).toHaveBeenCalledWith(CUSTOMER_HOME_PATH);
  });
});
