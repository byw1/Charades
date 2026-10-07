import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * On-device speech recognition, for the voice referee.
 *
 * Loaded as an optional native module rather than through the package's own
 * entry point, which throws when the module is missing. Expo Go does not
 * include it, so there the referee is simply unavailable instead of crashing
 * the app; in an installed build it is there.
 *
 * Recognition is always on the phone. Every request sets
 * requiresOnDeviceRecognition, and a phone that cannot recognise speech
 * offline is treated as not supporting the feature at all — Apple's servers
 * are never used as a fallback.
 */

type ResultEvent = { isFinal: boolean; results: { transcript: string }[] };
type Subscription = { remove(): void };

type SpeechModule = {
  start(options: Record<string, unknown>): void;
  stop(): void;
  abort(): void;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  getPermissionsAsync(): Promise<{ granted: boolean }>;
  supportsOnDeviceRecognition(): boolean;
  isRecognitionAvailable(): boolean;
  addListener(event: 'result', listener: (event: ResultEvent) => void): Subscription;
  addListener(event: 'error' | 'end', listener: () => void): Subscription;
};

let cached: SpeechModule | null | undefined;

function speech(): SpeechModule | null {
  if (cached !== undefined) return cached;
  cached = Platform.OS === 'web' ? null : requireOptionalNativeModule<SpeechModule>('ExpoSpeechRecognition');
  return cached;
}

/** Whether this phone, in this build, can listen without going online. */
export function voiceSupported(): boolean {
  const module = speech();
  if (!module) return false;
  try {
    return module.isRecognitionAvailable() && module.supportsOnDeviceRecognition();
  } catch {
    return false;
  }
}

export async function allowVoice(): Promise<boolean> {
  const module = speech();
  if (!module || !voiceSupported()) return false;
  try {
    return (await module.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function voicePermitted(): Promise<boolean> {
  const module = speech();
  if (!module) return false;
  try {
    return (await module.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * Listens until stopped, reporting every guess at what was said. Returns a
 * stop function. Does nothing, and stops nothing, where voice is unsupported.
 */
export function listen(hints: readonly string[], onHeard: (alternatives: string[]) => void): () => void {
  const module = speech();
  if (!module || !voiceSupported()) return () => undefined;

  const subscription = module.addListener('result', (event) => {
    onHeard(event.results.map((result) => result.transcript));
  });

  try {
    module.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      maxAlternatives: 3,
      // Non-negotiable: speech never leaves the phone.
      requiresOnDeviceRecognition: true,
      addsPunctuation: false,
      contextualStrings: [...hints],
      iosTaskHint: 'confirmation',
      // Mixes with anything playing, and keeps the speaker on.
      iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'mixWithOthers', 'allowBluetooth'], mode: 'measurement' },
    });
  } catch {
    subscription.remove();
    return () => undefined;
  }

  return () => {
    subscription.remove();
    try {
      module.abort();
    } catch {
      // Already stopped.
    }
  };
}
