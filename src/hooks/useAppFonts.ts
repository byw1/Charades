import {
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';

/**
 * Loads Nunito, the one typeface in the app. Bundled with the app, so this
 * reads from disk — no network, in keeping with the app being fully offline.
 *
 * Returns true once the app can render. Font loading failures resolve rather
 * than reject: the system face is a worse look, not a reason to refuse to
 * start a party game.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  return loaded || error !== null;
}
