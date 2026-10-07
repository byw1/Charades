import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { CARD_PHOTO_QUALITY, CARD_PHOTO_SIZE, centredSquare } from './crop';

/**
 * Photos for cards.
 *
 * Picked from the library or taken with the camera, cropped square, shrunk to
 * 640px and kept as a JPEG data URI inside the card. Nothing is uploaded and
 * nothing is left in the app's files: the photo lives in the deck, so it
 * travels with an exported deck and goes when the card goes.
 *
 * The library picker is Apple's own, which hands over only the photos the
 * person chooses, so it needs no photo library permission at all.
 */

async function toCardPhoto(asset: ImagePicker.ImagePickerAsset): Promise<string | null> {
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    if (asset.width > 0 && asset.height > 0 && asset.width !== asset.height) {
      context.crop(centredSquare(asset.width, asset.height));
    }
    context.resize({ width: CARD_PHOTO_SIZE, height: CARD_PHOTO_SIZE });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: CARD_PHOTO_QUALITY, base64: true });
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
  } catch {
    return null;
  }
}

async function convert(result: ImagePicker.ImagePickerResult): Promise<string[]> {
  if (result.canceled) return [];
  const photos = await Promise.all(result.assets.map(toCardPhoto));
  return photos.filter((photo): photo is string => photo !== null);
}

/** One photo, or several when `multiple`, from the photo library. */
export async function pickPhotos(options: { multiple?: boolean } = {}): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: options.multiple ?? false,
    selectionLimit: options.multiple ? 30 : 1,
    // A single photo can be framed by hand; several are cropped to the middle.
    allowsEditing: !options.multiple,
    aspect: [1, 1],
    quality: 1,
  });
  return convert(result);
}

/** A new photo from the camera. Null if the person declined or cancelled. */
export async function takePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  return (await convert(result))[0] ?? null;
}
