// lib/compress-image.ts
// Client-side image compression before upload to Vercel Blob.
// Resizes large images and converts to JPEG to save storage and transfer.

const MAX_DIMENSION = 1920; // max width or height in pixels
const JPEG_QUALITY = 0.75; // 0-1, 0.75 is a good balance of quality and size
const MAX_FILE_SIZE = 1 * 1024 * 1024; // target: under 1 MB after compression

/**
 * Compress an image file on the client before uploading.
 * - Resizes if larger than MAX_DIMENSION
 * - Converts PNG/WebP/etc to JPEG (smaller for photos)
 * - Preserves original if it's already small or not an image
 * - PDFs and non-image files pass through unchanged
 */
export async function compressImage(file: File): Promise<File> {
  // Skip non-image files (e.g. PDFs)
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip GIFs (they may be animated)
  if (file.type === 'image/gif') {
    return file;
  }

  // If already small enough, skip compression
  if (file.size <= MAX_FILE_SIZE) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if either dimension exceeds max
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help, return original
            resolve(file);
            return;
          }

          // Build a new File with .jpg extension
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressedFile = new File(
            [blob],
            `${baseName}.jpg`,
            { type: 'image/jpeg', lastModified: Date.now() }
          );

          resolve(compressedFile);
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original on error
    };

    img.src = url;
  });
}
