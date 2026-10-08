import { centredSquare } from './crop';

describe('centredSquare', () => {
  it('takes the middle of a portrait photo', () => {
    expect(centredSquare(1000, 1600)).toEqual({ originX: 0, originY: 300, width: 1000, height: 1000 });
  });

  it('takes the middle of a landscape photo', () => {
    expect(centredSquare(4032, 3024)).toEqual({ originX: 504, originY: 0, width: 3024, height: 3024 });
  });

  it('leaves a square photo alone', () => {
    expect(centredSquare(640, 640)).toEqual({ originX: 0, originY: 0, width: 640, height: 640 });
  });
});
