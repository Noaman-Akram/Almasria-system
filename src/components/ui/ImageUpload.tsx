import React, { useState, useCallback } from 'react';
import { Upload, Image, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { ImageCompression, CompressionResult } from '../../services/ImageCompression';

interface ImageUploadProps {
  onImagesSelect: (files: File[], previews: string[]) => void;
  onImageRemove: (index: number) => void;
  currentImages?: string[];
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
  onImagesSelect,
  onImageRemove,
  currentImages = [],
  uploading = false,
  disabled = false,
  maxSizeMB = 100,
  className = '',
}) => {
  const [compressionStatus, setCompressionStatus] = useState<CompressionStatus>({
    stage: 'idle',
    message: '',
  });

  const handleFilesSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      setCompressionStatus({ stage: 'validating', message: 'Validating images...' });
      const validFiles: File[] = [];
      const previews: string[] = [];
      for (const file of files) {
        const validation = ImageCompression.validateImageFile(file);
        if (!validation.valid) continue;
        const compressionResult = await ImageCompression.compressImage(
          file,
          0.8,
          1920,
          1080
        );
        const preview = await ImageCompression.createPreview(compressionResult.file);
        validFiles.push(compressionResult.file);
        previews.push(preview);
      }
      setCompressionStatus({ stage: 'complete', message: `Selected ${validFiles.length} images.` });
      // Append to current images instead of replacing
      const allFiles = [...(currentImages || []).map(() => null), ...validFiles]; // currentImages are URLs, not files, so just append new files
      const allPreviews = [...(currentImages || []), ...previews];
      onImagesSelect(allFiles.filter(Boolean) as File[], allPreviews);
      e.target.value = '';
    } catch (error) {
      setCompressionStatus({
        stage: 'error',
        message: 'Failed to process images. Please try different images.',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      e.target.value = '';
    }
  }, [onImagesSelect, currentImages]);


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
            Upload Images (Max {maxSizeMB}MB each)
          </label>
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <Upload className="h-5 w-5 mr-2" />
              <span>Select Images</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFilesSelect}
                disabled={disabled || uploading || compressionStatus.stage === 'compressing'}
              />
            </label>
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

        {/* Image Previews */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preview
          </label>
          <div className="flex flex-wrap gap-2">
            {currentImages && currentImages.length > 0 ? (
              currentImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img}
                    alt={`Preview ${idx + 1}`}
                    className="h-24 w-24 object-cover rounded border border-gray-200 bg-gray-50"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-red-600 hover:bg-opacity-100"
                    onClick={() => onImageRemove(idx)}
                    disabled={disabled || uploading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-24 w-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                <Image className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;