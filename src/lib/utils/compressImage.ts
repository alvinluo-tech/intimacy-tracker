import imageCompression from "browser-image-compression";

export async function compressImage(
  file: File,
  opts?: { maxSizeMB?: number; maxWidthOrHeight?: number }
): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: opts?.maxSizeMB ?? 1,
    maxWidthOrHeight: opts?.maxWidthOrHeight ?? 1920,
    useWebWorker: true,
    fileType: file.type,
  });
}
