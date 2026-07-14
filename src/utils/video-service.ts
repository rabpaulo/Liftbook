import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import { createId } from "@/utils/training-id";

export class VideoPermissionError extends Error {}
export class VideoCopyError extends Error {}

const videoDirectory = new Directory(Paths.document, "workout-videos");

function extensionFor(asset: ImagePicker.ImagePickerAsset) {
  const fromName = asset.fileName?.match(/\.[a-z0-9]+$/i)?.[0];
  if (fromName) return fromName.toLowerCase();
  if (asset.mimeType === "video/quicktime") return ".mov";
  return ".mp4";
}

async function persistAsset(asset: ImagePicker.ImagePickerAsset) {
  try {
    videoDirectory.create({ idempotent: true, intermediates: true });
    const source = new File(asset.uri);
    const destination = new File(videoDirectory, `${createId()}${extensionFor(asset)}`);
    await source.copy(destination);
    return destination.uri;
  } catch (error) {
    if (__DEV__) console.error("Failed to copy workout video", error);
    throw new VideoCopyError("The video could not be copied to app storage.");
  }
}

export const videoService = {
  async pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new VideoPermissionError("Media-library permission is required to choose a video.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1 });
    if (result.canceled || !result.assets[0]) return null;
    return persistAsset(result.assets[0]);
  },

  async record() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new VideoPermissionError("Camera permission is required to record a video.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], videoMaxDuration: 300, quality: 1 });
    if (result.canceled || !result.assets[0]) return null;
    return persistAsset(result.assets[0]);
  },

  exists(uri: string | null) {
    if (!uri) return false;
    try {
      return new File(uri).exists;
    } catch {
      return false;
    }
  },

  async remove(uri: string | null) {
    if (!uri) return;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch (error) {
      if (__DEV__) console.warn("Could not remove workout video", error);
    }
  },

  async removeMany(uris: readonly string[]) {
    await Promise.all(uris.map((uri) => this.remove(uri)));
  },
};
