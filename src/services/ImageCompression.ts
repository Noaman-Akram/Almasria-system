/**
 * Image Compression Service
 * Handles image validation, compression, and upload operations
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  preserveExif: boolean;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions?: { width: number; height: number };
}

export class ImageCompression {
  // Default compression settings
  private static readonly DEFAULT_OPTIONS: CompressionOptions = {
    maxSizeMB: 2,
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    preserveExif: true,
  };

  // Supported image formats
  private static readonly SUPPORTED_FORMATS = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/bmp',
  ];

  // Maximum file size (100MB)
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024;

  /**
   * Validates an image file for type and size constraints
   */
  static validateImageFile(file: File): ImageValidationResult {
    try {
      // Check if file exists
      if (!file) {
        return {
          valid: false,
          error: 'No file provided'
        };
      }

      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        return {
          valid: false,
          error: 'File must be an image'
        };
      }

      // Check file size
      if (file.size > this.MAX_FILE_SIZE) {
        const maxSizeMB = this.MAX_FILE_SIZE / 1024 / 1024;
        return {
          valid: false,
          error: `File size must be less than ${maxSizeMB}MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
        };
      }

      // Check for supported formats
      if (!this.SUPPORTED_FORMATS.includes(file.type.toLowerCase())) {
        return {
          valid: false,
          error: 'Unsupported image format. Please use JPEG, PNG, GIF, WebP, or BMP.'
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('[ImageCompression] Validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate image file'
      };
    }
  }

  /**
   * Gets image dimensions
   */
  static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Creates a preview URL for an image file
   */
  static createPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to create image preview'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Canvas-based image compression (fallback method)
   */
  private static compressWithCanvas(
    file: File,
    quality: number = 0.8,
    maxWidth: number = 1920,
    maxHeight: number = 1080
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with quality setting
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create compressed blob'));
                return;
              }

              // Create new file from blob
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            file.type,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Compresses an image file with multiple fallback methods
   */
  static async compressImage(
    file: File,
    quality: number = 0.8,
    maxWidth: number = 1920,
    maxHeight: number = 1080
  ): Promise<CompressionResult> {
    const originalSize = file.size;
    let originalDimensions: { width: number; height: number };

    try {
      originalDimensions = await this.getImageDimensions(file);
    } catch (error) {
      console.warn('[ImageCompression] Could not get original dimensions:', error);
      originalDimensions = { width: 0, height: 0 };
    }

    console.log('[ImageCompression] Starting compression...');
    console.log(`[ImageCompression] Original: ${this.formatFileSize(originalSize)}, ${originalDimensions.width}x${originalDimensions.height}`);

    // Method 1: Try browser-image-compression library
    try {
      const imageCompression = (await import('browser-image-compression')).default;

      const options = {
        maxSizeMB: this.DEFAULT_OPTIONS.maxSizeMB,
        maxWidthOrHeight: Math.max(maxWidth, maxHeight),
        useWebWorker: false, // Disable web worker to avoid blob issues
        preserveExif: false, // Disable EXIF to avoid compatibility issues
        fileType: file.type,
        initialQuality: quality,
      };

      console.log('[ImageCompression] Trying browser-image-compression...');
      const compressedFile = await imageCompression(file, options);
      const compressionRatio = originalSize / compressedFile.size;

      console.log(`[ImageCompression] Success with browser-image-compression: ${this.formatFileSize(compressedFile.size)}`);
      console.log(`[ImageCompression] Compression ratio: ${compressionRatio.toFixed(2)}x`);

      return {
        file: compressedFile,
        originalSize,
        compressedSize: compressedFile.size,
        compressionRatio,
        dimensions: originalDimensions,
      };
    } catch (error) {
      console.warn('[ImageCompression] browser-image-compression failed, trying canvas fallback:', error);
    }

    // Method 2: Canvas-based compression fallback
    try {
      console.log('[ImageCompression] Trying canvas-based compression...');
      const compressedFile = await this.compressWithCanvas(file, quality, maxWidth, maxHeight);
      const compressionRatio = originalSize / compressedFile.size;

      console.log(`[ImageCompression] Success with canvas compression: ${this.formatFileSize(compressedFile.size)}`);
      console.log(`[ImageCompression] Compression ratio: ${compressionRatio.toFixed(2)}x`);

      return {
        file: compressedFile,
        originalSize,
        compressedSize: compressedFile.size,
        compressionRatio,
        dimensions: originalDimensions,
      };
    } catch (error) {
      console.warn('[ImageCompression] Canvas compression failed:', error);
    }

    // Method 3: Return original file if all compression methods fail
    console.log('[ImageCompression] All compression methods failed, returning original file');
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      dimensions: originalDimensions,
    };
  }

  /**
   * Formats file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Calculates compression savings
   */
  static getCompressionSavings(originalSize: number, compressedSize: number): {
    savedBytes: number;
    savedPercentage: number;
    savedFormatted: string;
  } {
    const savedBytes = originalSize - compressedSize;
    const savedPercentage = (savedBytes / originalSize) * 100;
    
    return {
      savedBytes,
      savedPercentage,
      savedFormatted: this.formatFileSize(savedBytes),
    };
  }
}