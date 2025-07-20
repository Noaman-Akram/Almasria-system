import React, { useState, useCallback } from 'react';
import { Upload, Image, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './Button';
import { ImageCompression, CompressionResult } from '../../services/ImageCompression';

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string) => void;
  onImageRemove: () => void;
  currentImage?: string | null;
  uploading?: boolean;
  disabled?: boolean;
  maxSizeMB?: number;
  className?: string;
}

interface CompressionStatus {
  stage: 'idle' | 'validating' | 'compressing' | 'complete' | 'error';
  message: string;
  result?: CompressionResult;
  error?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onImageRemove,
  currentImage,
  uploading = false,
  disabled = false,
  maxSizeMB = 100,
  className = '',
}) => {
  const [compressionStatus, setCompressionStatus] = useState<CompressionStatus>({
    stage: 'idle',
    message: '',
  });

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Reset status
      setCompressionStatus({
        stage: 'validating',
        message: 'Validating image...',
      });

      // Validate the file
      const validation = ImageCompression.validateImageFile(file);
      if (!validation.valid) {
        setCompressionStatus({
          stage: 'error',
          message: validation.error || 'Invalid image file',
          error: validation.error,
        });
        // Clear the input on validation error
        e.target.value = '';
        return;
      }

      // Show original file info
      const originalSize = ImageCompression.formatFileSize(file.size);
      const dimensions = await ImageCompression.getImageDimensions(file);
      
      setCompressionStatus({
        stage: 'compressing',
        message: `Original: ${originalSize} (${dimensions.width}×${dimensions.height}) - Optimizing image...`,
      });

      // Compress the image
      const compressionResult = await ImageCompression.compressImage(
        file,
        0.8, // Good quality
        1920, // Max width
        1080  // Max height
      );

      // Create preview
      const preview = await ImageCompression.createPreview(compressionResult.file);

      // Calculate savings
      const savings = ImageCompression.getCompressionSavings(
        compressionResult.originalSize,
        compressionResult.compressedSize
      );

      setCompressionStatus({
        stage: 'complete',
        message: `Optimized: ${ImageCompression.formatFileSize(compressionResult.compressedSize)} (${compressionResult.compressionRatio.toFixed(1)}x smaller, saved ${savings.savedFormatted})`,
        result: compressionResult,
      });

      // Call the parent callback
      onImageSelect(compressionResult.file, preview);

      // Clear the input
      e.target.value = '';

    } catch (error) {
      console.error('[ImageUpload] Error processing image:', error);
      // Clear the input on error
      e.target.value = '';
      setCompressionStatus({
        stage: 'error',
        message: 'Failed to process image. Please try a different image.',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [onImageSelect]);

  const handleRemove = useCallback(() => {
    setCompressionStatus({
      stage: 'idle',
      message: '',
    });
    onImageRemove();
  }, [onImageRemove]);

  const getStatusIcon = () => {
    switch (compressionStatus.stage) {
      case 'validating':
      case 'compressing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (compressionStatus.stage) {
      case 'validating':
      case 'compressing':
        return 'text-blue-600';
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Controls */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image (Max {maxSizeMB}MB)
          </label>
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <Upload className="h-5 w-5 mr-2" />
              <span>Select Image</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={disabled || uploading || compressionStatus.stage === 'compressing'}
              />
            </label>
            {currentImage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="text-red-600"
                disabled={disabled || uploading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>

          {/* Compression Status */}
          {compressionStatus.message && (
            <div className="mt-2 flex items-center space-x-2">
              {getStatusIcon()}
              <p className={`text-xs ${getStatusColor()}`}>
                {compressionStatus.message}
              </p>
            </div>
          )}

          {/* Error Details */}
          {compressionStatus.stage === 'error' && compressionStatus.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-700">{compressionStatus.error}</p>
            </div>
          )}

          {/* Compression Details */}
          {compressionStatus.stage === 'complete' && compressionStatus.result && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <div className="text-xs text-green-700 space-y-1">
                <p>✓ Image processed successfully</p>
                {compressionStatus.result.dimensions && (
                  <p>📐 Size: {compressionStatus.result.dimensions.width}×{compressionStatus.result.dimensions.height}px</p>
                )}
                <p>📦 Optimized: {compressionStatus.result.compressionRatio.toFixed(1)}x smaller than original</p>
              </div>
            </div>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Images are automatically optimized to reduce file size while preserving quality.
            Supported formats: JPEG, PNG, GIF, WebP, BMP.
          </p>
        </div>

        {/* Image Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preview
          </label>
          {uploading ? (
            <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Uploading...</p>
              </div>
            </div>
          ) : currentImage ? (
            <div className="relative">
              <img
                src={currentImage}
                alt="Preview"
                className="h-40 w-full object-contain rounded-lg border border-gray-200 bg-gray-50"
                onError={(e) => {
                  console.error('Image preview failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
              {compressionStatus.stage === 'compressing' && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-1" />
                    <p className="text-xs text-blue-600">Optimizing...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center text-gray-400">
                <Image className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No image selected</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;