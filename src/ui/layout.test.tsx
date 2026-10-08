import { layoutFor } from './layout';

describe('layoutFor', () => {
  it('reads an upright iPhone as tall', () => {
    expect(layoutFor(390, 844)).toEqual({ width: 390, height: 844, landscape: false, short: false });
  });

  it('reads a sideways iPhone as wide and short', () => {
    expect(layoutFor(844, 390)).toMatchObject({ landscape: true, short: true });
  });

  it('reads the biggest iPhone on its side as short too', () => {
    expect(layoutFor(956, 440).short).toBe(true);
  });
});
