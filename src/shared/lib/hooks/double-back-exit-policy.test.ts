import { describe, expect, it } from 'vitest';
import { isSecondBackWithinWindow } from './double-back-exit-policy';

describe('isSecondBackWithinWindow', () => {
  it('첫 뒤로가기는 종료하지 않는다', () => {
    expect(isSecondBackWithinWindow(null, 1_000)).toBe(false);
  });

  it('2초 이내와 정확히 2초인 두 번째 뒤로가기는 종료한다', () => {
    expect(isSecondBackWithinWindow(1_000, 2_999)).toBe(true);
    expect(isSecondBackWithinWindow(1_000, 3_000)).toBe(true);
  });

  it('2초를 초과하거나 기기 시간이 이전으로 바뀌면 종료하지 않는다', () => {
    expect(isSecondBackWithinWindow(1_000, 3_001)).toBe(false);
    expect(isSecondBackWithinWindow(1_000, 999)).toBe(false);
  });
});
