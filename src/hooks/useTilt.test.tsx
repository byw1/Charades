import { act, renderHook } from '@testing-library/react-native';
import { useTilt } from './useTilt';

/**
 * Tilt is the default control, so the one thing this hook must never do is
 * leave a round with no way to answer. These check the fallbacks to tap; the
 * gesture maths is covered in /src/game/tilt.
 */

type Reading = { x: number; y: number; z: number };
let mockListener: ((reading: Reading) => void) | null = null;
let mockAvailable: Promise<boolean> = Promise.resolve(true);
let mockSubscribeThrows = false;

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    isAvailableAsync: () => mockAvailable,
    setUpdateInterval: () => undefined,
    addListener: (fn: (reading: Reading) => void) => {
      if (mockSubscribeThrows) throw new Error('no native module');
      mockListener = fn;
      return { remove: () => (mockListener = null) };
    },
  },
}));

const run = () => renderHook(() => useTilt({ enabled: true, onGesture: () => undefined }));

beforeEach(() => {
  jest.useFakeTimers();
  mockListener = null;
  mockAvailable = Promise.resolve(true);
  mockSubscribeThrows = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useTilt', () => {
  it('stays on tilt while the sensor is reporting', async () => {
    const { result } = run();
    await act(async () => {
      mockListener?.({ x: 0, y: 0, z: 0 });
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.available).toBe(true);
  });

  it('hands back to tap when the phone has no accelerometer', async () => {
    mockAvailable = Promise.resolve(false);
    const { result } = run();
    await act(async () => undefined);
    expect(result.current.available).toBe(false);
  });

  it('hands back to tap when the sensor never reports', async () => {
    const { result } = run();
    expect(result.current.available).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.available).toBe(false);
  });

  it('hands back to tap when the sensor cannot be subscribed to', async () => {
    mockSubscribeThrows = true;
    const { result } = run();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.available).toBe(false);
  });

  it('lets go of the sensor when switched off', () => {
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useTilt({ enabled, onGesture: () => undefined }), {
      initialProps: { enabled: true },
    });
    expect(mockListener).not.toBeNull();
    rerender({ enabled: false });
    expect(mockListener).toBeNull();
  });
});
