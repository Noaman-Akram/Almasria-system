import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ImageCompression } from '../services/ImageCompression';

interface UseImageUploadOptions {
  bucket: string;
  folder?: string;
  onUploadStart?: () => void;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  url: string | null;
}

export function useImageUpload(options: UseImageUploadOptions) {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    url: null,
  });

  const uploadImage = useCallback(async (
    file: File,
    filename?: string
  ): Promise<string> => {
    try {
      setState(prev => ({
        ...prev,
        uploading: true,
        progress: 0,
        error: null,
      }));

      options.onUploadStart?.();

      // Generate filename if not provided
      const finalFilename = filename || `${options.folder || 'images'}/${Date.now()}-${file.name}`;

      setState(prev => ({ ...prev, progress: 25 }));

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(finalFilename, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      setState(prev => ({ ...prev, progress: 75 }));

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      setState(prev => ({
        ...prev,
        progress: 100,
        uploading: false,
        url: publicUrl,
      }));

      options.onUploadComplete?.(publicUrl);
      return publicUrl;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setState(prev => ({
        ...prev,
        uploading: false,
        progress: 0,
        error: errorMessage,
      }));

      options.onUploadError?.(errorMessage);
      throw error;
    }
  }, [options]);

  const reset = useCallback(() => {
    setState({
      uploading: false,
      progress: 0,
      error: null,
      url: null,
    });
  }, []);

  return {
    ...state,
    uploadImage,
    reset,
  };
}