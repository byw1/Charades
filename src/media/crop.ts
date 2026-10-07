/**
 * The largest centred square in an image. Card photos are square so they
 * read the same on every card, and a face in the middle of a portrait shot
 * stays in the middle of the card.
 */
export function centredSquare(width: number, height: number): { originX: number; originY: number; width: number; height: number } {
  const side = Math.max(1, Math.floor(Math.min(width, height)));
  return {
    originX: Math.max(0, Math.floor((width - side) / 2)),
    originY: Math.max(0, Math.floor((height - side) / 2)),
    width: side,
    height: side,
  };
}

/** Photos are stored at this size: sharp on a phone, small inside a deck. */
export const CARD_PHOTO_SIZE = 640;
export const CARD_PHOTO_QUALITY = 0.6;
