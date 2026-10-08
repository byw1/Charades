import { clampRoundSeconds, nextRoundSeconds } from './types';

describe('round length', () => {
  it('cycles 30, 60, 90 and back to 30', () => {
    expect(nextRoundSeconds(30)).toBe(60);
    expect(nextRoundSeconds(60)).toBe(90);
    expect(nextRoundSeconds(90)).toBe(30);
  });

  it('steps a custom length to the next preset up', () => {
    expect(nextRoundSeconds(45)).toBe(60);
    expect(nextRoundSeconds(120)).toBe(30);
  });

  it('keeps lengths within limits', () => {
    expect(clampRoundSeconds(3)).toBe(15);
    expect(clampRoundSeconds(500)).toBe(180);
    expect(clampRoundSeconds(Number.NaN)).toBe(60);
  });
});
