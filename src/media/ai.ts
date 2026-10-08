import { Platform, TurboModuleRegistry, type TurboModule } from 'react-native';
import { DECK_INSTRUCTIONS, deckPrompt, parseGeneratedCards } from '@/decks/generate';

/**
 * Apple's on-device language model, for the deck maker.
 *
 * Reached through the native module that @react-native-ai/apple installs,
 * looked up optionally rather than through that package's own entry point,
 * which throws when the module is missing. So in Expo Go, on Android, and on
 * any iPhone without Apple Intelligence (before iOS 26, or older than an
 * iPhone 15 Pro, or with it switched off), the deck maker simply does not
 * appear.
 *
 * The model runs entirely on the phone. Nothing about the theme or the cards
 * leaves it, and it works in airplane mode.
 */

type Message = { role: 'system' | 'user' | 'assistant'; content: string };
type Part = { type: string; text?: string };

interface AppleLLM extends TurboModule {
  isAvailable(): boolean;
  generateText(messages: Message[], options: { temperature?: number; maxTokens?: number }): Promise<Part[]>;
}

let cached: AppleLLM | null | undefined;

function model(): AppleLLM | null {
  if (cached !== undefined) return cached;
  try {
    cached = Platform.OS === 'ios' ? TurboModuleRegistry.get<AppleLLM>('NativeAppleLLM') : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Whether this phone can write a deck right now. */
export function deckMakerAvailable(): boolean {
  try {
    return model()?.isAvailable() === true;
  } catch {
    return false;
  }
}

export class DeckMakerError extends Error {}

/** Writes cards for a theme. Throws a DeckMakerError with a message for a person. */
export async function dreamUpCards(theme: string, count = 30): Promise<string[]> {
  const llm = model();
  if (!llm || !deckMakerAvailable()) {
    throw new DeckMakerError('Apple Intelligence isn’t available on this iPhone right now.');
  }

  let parts: Part[];
  try {
    parts = await llm.generateText(
      [
        { role: 'system', content: DECK_INSTRUCTIONS },
        { role: 'user', content: deckPrompt(theme, count) },
      ],
      { temperature: 0.8, maxTokens: 700 },
    );
  } catch {
    // Most often Apple's own safety filter declining a theme.
    throw new DeckMakerError('That theme didn’t work. Try putting it a different way.');
  }

  const text = parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('\n');
  const cards = parseGeneratedCards(text, count + 10);
  if (cards.length === 0) throw new DeckMakerError('Nothing usable came back. Try a different theme.');
  return cards;
}
