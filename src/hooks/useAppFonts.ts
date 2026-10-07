import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';

/**
 * Loads the app's two typefaces. Bundled with the app, so this reads from
 * disk — no network, in keeping with the app being fully offline.
 *
 * Returns true once the app can render. Font loading failures resolve rather
 * than reject: the system face is a worse look, not a reason to refuse to
 * start a party game.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  return loaded || error !== null;
}
