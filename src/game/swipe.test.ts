import { swipeOutcome } from './swipe';

describe('swipeOutcome', () => {
  it('reads a swipe up as got it and down as a pass', () => {
    expect(swipeOutcome(0, -120)).toBe('correct');
    expect(swipeOutcome(5, 120)).toBe('pass');
  });

  it('ignores a tap or a short nudge', () => {
    expect(swipeOutcome(0, 0)).toBeNull();
    expect(swipeOutcome(0, -20)).toBeNull();
  });

  it('ignores a mostly sideways brush', () => {
    expect(swipeOutcome(150, -80)).toBeNull();
  });

  it('takes a short fast flick', () => {
    expect(swipeOutcome(0, -35, -1.2)).toBe('correct');
    expect(swipeOutcome(0, -35, -0.1)).toBeNull();
  });
});
