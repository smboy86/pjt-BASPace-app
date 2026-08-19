import { describe, expect, test } from 'vitest';
import { resolveAuthRedirect } from './auth-routing';

describe('resolveAuthRedirect', () => {
  test('keeps a cold-start callback accessible before authentication', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        role: null,
        segments: ['auth', 'callback'],
      }),
    ).toBeNull();
  });

  test('keeps a warm callback accessible over an existing customer session', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        role: 'customer',
        segments: ['auth', 'callback'],
      }),
    ).toBeNull();
  });

  test('redirects an unauthenticated protected route to login', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        role: null,
        segments: ['(tabs)', 'home'],
      }),
    ).toBe('/(auth)/login');
  });

  test('redirects an authenticated customer to the customer home', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        role: 'customer',
        segments: ['(auth)', 'login'],
      }),
    ).toBe('/(tabs)/home');
  });
});
