import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const storageService = {
  /**
   * Upload a photo for a Friendly Person into the 'friendly-persons' bucket
   */
  async uploadFriendlyPersonPhoto(file, personCode) {
    if (!file || !isSupabaseConfigured) {
      return null;
    }

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const cleanCode = (personCode || 'person').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanCode}_${Date.now()}.${fileExt}`;
      const filePath = `photos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('friendly-persons')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.warn('Storage upload error (falling back to local object URL):', error.message);
        return URL.createObjectURL(file);
      }

      // Try signed URL or public URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('friendly-persons')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year signed URL

      if (!signedError && signedData?.signedUrl) {
        return signedData.signedUrl;
      }

      const { data: publicData } = supabase.storage
        .from('friendly-persons')
        .getPublicUrl(filePath);

      return publicData?.publicUrl || URL.createObjectURL(file);
    } catch (err) {
      console.error('Failed to upload photo to Supabase storage:', err);
      return file instanceof File ? URL.createObjectURL(file) : null;
    }
  },

  /**
   * Upload an evidence image/clip into the 'evidence' bucket
   */
  async uploadEvidenceFile(file, eventId) {
    if (!file || !isSupabaseConfigured) {
      return null;
    }

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `evidence_${eventId || Date.now()}_${Date.now()}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const { data, error } = await supabase.storage
        .from('evidence')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.warn('Evidence upload error:', error.message);
        return null;
      }

      const { data: signedData } = await supabase.storage
        .from('evidence')
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);

      return signedData?.signedUrl || null;
    } catch (err) {
      console.error('Evidence upload exception:', err);
      return null;
    }
  }
};
