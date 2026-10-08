import { Directory, Paths } from 'expo-file-system';

/**
 * Clears files left behind by features that have since been removed, so an
 * update never strands storage on someone's phone.
 *
 * Round videos lived in reels/ in the documents folder. They can be large, and
 * nothing reads them any more, so the folder goes on the next launch. Cheap
 * to run every time: once it is gone, this is a single existence check.
 */
export function removeLeftovers(): void {
  try {
    const reels = new Directory(Paths.document, 'reels');
    if (reels.exists) reels.delete();
  } catch {
    // Nothing to do; it will be tried again next launch.
  }
}
