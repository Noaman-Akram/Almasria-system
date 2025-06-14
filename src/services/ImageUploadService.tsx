import { supabase } from '../lib/supabase';

export class ImageUploadService {
  private static bucketName = 'word-order-img';

  static async uploadWorkOrderImage(
    file: File,
    workOrderId: string
  ): Promise<string> {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `work-order-${workOrderId}-${Date.now()}.${fileExt}`;

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  static async deleteWorkOrderImage(imageUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) {
        console.error('Error deleting image:', error);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  static async updateWorkOrderImage(
    detailId: number,
    imageUrl: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('order_details')
        .update({ img_url: imageUrl })
        .eq('detail_id', detailId);

      if (error) {
        throw new Error(`Failed to update image URL: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating image URL:', error);
      throw error;
    }
  }
}
