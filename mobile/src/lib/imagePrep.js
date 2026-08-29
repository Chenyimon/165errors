import * as ImageManipulator from 'expo-image-manipulator';

// Camera photos can be several MB straight off the sensor — shrinking to this width
// before it ever leaves the device keeps the base64 payload small enough to upload quickly.
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

// Takes the raw camera URI, resizes it down for a fast upload, and returns both a
// local URI (for on-screen preview / the eventual post upload) and a base64 string
// ready to POST straight to the classify endpoint.
export async function prepareImageForUpload(uri) {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  return {
    uri: manipulated.uri,
    base64: manipulated.base64,
    mediaType: 'image/jpeg',
  };
}

const AVATAR_DIMENSION = 480;

// Profile pictures render small (a header/post-card circle), so there's no need
// for the full 1024px post-upload size here.
export async function prepareAvatarForUpload(uri) {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: AVATAR_DIMENSION } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );
  return { uri: manipulated.uri, mediaType: 'image/jpeg' };
}
