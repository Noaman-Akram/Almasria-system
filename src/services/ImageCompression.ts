/**
 * Service for compressing images before upload
 */
export class ImageCompression {
  /**
   * Compresses an image file while maintaining reasonable quality
   * @param file The original image file to compress
   * @param maxSizeMB Maximum size in MB (default: 1MB)
   * @param maxWidthOrHeight Maximum width or height in pixels (default: 1920px)
   * @returns A Promise that resolves to the compressed image file
   */
  static async compressImage(
    file: File,
    maxSizeMB: number = 1,
    maxWidthOrHeight: number = 1920
  ): Promise<File> {
    try {
      // Import the library dynamically to avoid SSR issues
      const imageCompression = (await import('browser-image-compression'))
        .default;

      // Options for compression
      const options = {
        maxSizeMB: maxSizeMB,
        maxWidthOrHeight: maxWidthOrHeight,
        useWebWorker: true,
        preserveExif: true, // Preserve image metadata
        fileType: file.type, // Maintain the original file type
      };

      console.log('[ImageCompression] Starting compression');
      console.log(
        `[ImageCompression] Original file: ${(file.size / 1024 / 1024).toFixed(
          2
        )}MB, type: ${file.type}`
      );

      // Perform the compression
      const compressedFile = await imageCompression(file, options);

      console.log(
        `[ImageCompression] Compressed file: ${(
          compressedFile.size /
          1024 /
          1024
        ).toFixed(2)}MB`
      );
      console.log(
        `[ImageCompression] Compression ratio: ${(
          file.size / compressedFile.size
        ).toFixed(2)}x`
      );

      return compressedFile;
    } catch (error) {
      console.error('[ImageCompression] Error compressing image:', error);
      // If compression fails, return the original file
      console.log(
        '[ImageCompression] Returning original file due to compression error'
      );
      return file;
    }
  }

  /**
   * Creates a preview of an image file
   * @param file The image file to preview
   * @returns A Promise that resolves to a data URL for the preview
   */
  static async createPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
