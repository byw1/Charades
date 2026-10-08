import { Directory, File, Paths } from 'expo-file-system';

/**
 * Round videos, kept on the phone.
 *
 * Each round's clip lives at reels/<session>/<round>.mov in the app's own
 * documents folder, with a small JSON note beside it saying where in the
 * round the clip began. Nothing is uploaded; a clip leaves the phone only if
 * someone shares it, and the reel screen can delete a night's clips in one go.
 *
 * Stored relative to the documents folder rather than as a full path, because
 * iOS moves an app's container between updates and a saved absolute path
 * would point nowhere.
 */

export type Clip = { roundId: string; uri: string; startRoundMs: number };

const ROOT = 'reels';

function sessionDir(sessionId: string): Directory {
  return new Directory(Paths.document, ROOT, sessionId);
}

export async function saveClip(sessionId: string, roundId: string, recordedUri: string, startRoundMs: number): Promise<void> {
  try {
    const dir = sessionDir(sessionId);
    if (!dir.exists) dir.create({ intermediates: true });

    const video = new File(dir, `${roundId}.mov`);
    if (video.exists) video.delete();
    await new File(recordedUri).move(video);

    const note = new File(dir, `${roundId}.json`);
    if (note.exists) note.delete();
    note.create();
    note.write(JSON.stringify({ startRoundMs: Math.max(0, Math.round(startRoundMs)) }));
  } catch {
    // A clip that could not be saved is a lost clip, not a broken game.
  }
}

export function listClips(sessionId: string): Clip[] {
  try {
    const dir = sessionDir(sessionId);
    if (!dir.exists) return [];
    return dir
      .list()
      .filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.mov'))
      .map((video) => {
        const roundId = video.name.replace(/\.mov$/, '');
        let startRoundMs = 0;
        try {
          const note = new File(dir, `${roundId}.json`);
          if (note.exists) startRoundMs = Number(JSON.parse(note.textSync()).startRoundMs) || 0;
        } catch {
          // No note: assume the clip began with the round.
        }
        return { roundId, uri: video.uri, startRoundMs };
      });
  } catch {
    return [];
  }
}

export function hasClips(sessionId: string): boolean {
  return listClips(sessionId).length > 0;
}

export function deleteClips(sessionId: string): void {
  try {
    const dir = sessionDir(sessionId);
    if (dir.exists) dir.delete();
  } catch {
    // Nothing to tidy.
  }
}
