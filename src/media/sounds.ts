import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Sound effects.
 *
 * Seven short sounds, synthesised by spec/generate-sounds.js and bundled with
 * the app, so they play offline and instantly. Each gets one player, loaded
 * once and rewound to replay. Sounds mix with whatever music is playing and
 * respect the phone's silent switch, so a muted phone stays muted.
 *
 * A sound that fails to load or play is skipped: it is never worth breaking
 * a round over.
 */

export type SoundName = 'correct' | 'pass' | 'busted' | 'tick' | 'go' | 'timeup' | 'win';

const SOURCES: Record<SoundName, number> = {
  correct: require('../../assets/sounds/correct.wav') as number,
  pass: require('../../assets/sounds/pass.wav') as number,
  busted: require('../../assets/sounds/busted.wav') as number,
  tick: require('../../assets/sounds/tick.wav') as number,
  go: require('../../assets/sounds/go.wav') as number,
  timeup: require('../../assets/sounds/timeup.wav') as number,
  win: require('../../assets/sounds/win.wav') as number,
};

const players = new Map<SoundName, AudioPlayer>();
let configured = false;

function playerFor(name: SoundName): AudioPlayer | null {
  const existing = players.get(name);
  if (existing) return existing;
  try {
    if (!configured) {
      configured = true;
      void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    }
    const player = createAudioPlayer(SOURCES[name]);
    player.volume = name === 'tick' ? 0.6 : 0.9;
    players.set(name, player);
    return player;
  } catch {
    return null;
  }
}

/** Loads every sound ahead of a round, so the first ding isn't late. */
export function preloadSounds(): void {
  for (const name of Object.keys(SOURCES) as SoundName[]) playerFor(name);
}

/** Plays a sound from the top. Fire and forget: a sound never breaks a round. */
export function playSound(name: SoundName): void {
  const player = playerFor(name);
  if (!player) return;
  try {
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => undefined);
  } catch {
    // Nothing to do; it was only a sound.
  }
}
