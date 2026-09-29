import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_FRIENDLY_PERSONS } from '../data/mockData';

const LOCAL_STORAGE_KEY = 'ibvap_friendly_persons';

function getLocalFriendlyPersons() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return MOCK_FRIENDLY_PERSONS;
}

function saveLocalFriendlyPersons(list) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

/**
 * Normalizes Supabase database row or local mock object to standard UI model
 */
function normalizePerson(row) {
  return {
    id: row.id,
    fullName: row.full_name || row.fullName || 'Authorized Personnel',
    personCode: row.person_code || row.personId || row.personCode || 'BSF-1000',
    department: row.department || 'Border Security Force',
    role: row.role || 'Patrol Officer',
    status: row.status || 'FRIENDLY',
    photoUrl: row.photo_url || row.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: row.created_at || row.registeredOn || new Date().toISOString(),
    updatedAt: row.updated_at || row.lastVerified || new Date().toISOString(),
    // Prepared for future facial recognition engine
    faceEmbedding: row.face_embedding || row.embeddingHash || null,
    confidenceScore: row.confidence_score || row.confidenceScore || 0.985
  };
}

export const friendlyPersonsService = {
  /**
   * Fetch all records from friendly_persons table
   */
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('friendly_persons')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase friendly_persons select error:', error.message);
          throw new Error(error.message);
        }

        if (data && data.length > 0) {
          return { data: data.map(normalizePerson), error: null };
        }
        
        // If Supabase table is empty, return empty array (or local data if not yet initialized)
        const local = getLocalFriendlyPersons();
        return { data: data ? data.map(normalizePerson) : local.map(normalizePerson), error: null };
      } catch (err) {
        console.warn('friendly_persons query fallback:', err);
        const local = getLocalFriendlyPersons();
        return { data: local.map(normalizePerson), error: err.message };
      }
    }
    const local = getLocalFriendlyPersons();
    return { data: local.map(normalizePerson), error: null };
  },

  /**
   * Upload photo to the private/public 'friendly-persons' Supabase Storage bucket
   */
  async uploadPhoto(file, personCode) {
    if (!file) return null;

    if (!isSupabaseConfigured) {
      return URL.createObjectURL(file);
    }

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const cleanCode = (personCode || 'person').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanCode}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data, error } = await supabase.storage
        .from('friendly-persons')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.warn('Storage upload error in friendly-persons bucket:', error.message);
        // If bucket is not public/setup, fallback to local URL preview
        return URL.createObjectURL(file);
      }

      // Try signed URL (valid for 1 year for private bucket)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('friendly-persons')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (!signedError && signedData?.signedUrl) {
        return signedData.signedUrl;
      }

      // Public URL fallback
      const { data: publicData } = supabase.storage
        .from('friendly-persons')
        .getPublicUrl(filePath);

      return publicData?.publicUrl || URL.createObjectURL(file);
    } catch (err) {
      console.error('Photo upload exception:', err);
      return URL.createObjectURL(file);
    }
  },

  /**
   * Delete photo from storage bucket
   */
  async deletePhoto(photoUrl) {
    if (!photoUrl || !isSupabaseConfigured) return;
    try {
      if (photoUrl.includes('/friendly-persons/')) {
        const parts = photoUrl.split('/friendly-persons/');
        if (parts[1]) {
          const filePath = parts[1].split('?')[0]; // strip signed params
          await supabase.storage.from('friendly-persons').remove([filePath]);
        }
      }
    } catch (err) {
      console.warn('Failed to delete photo from storage:', err);
    }
  },

  /**
   * Insert new friendly person into friendly_persons table
   */
  async create(personData, photoFile = null) {
    let uploadedPhotoUrl = personData.photoUrl;

    if (photoFile) {
      uploadedPhotoUrl = await this.uploadPhoto(photoFile, personData.personCode || personData.fullName);
    }

    const payload = {
      full_name: personData.fullName,
      person_code: personData.personCode || `BSF-${Math.floor(1000 + Math.random() * 9000)}`,
      department: personData.department || 'Border Security Force',
      role: personData.role || 'Patrol Officer',
      photo_url: uploadedPhotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: personData.status || 'FRIENDLY',
      // Data model prepared for future face recognition embedding pipeline
      face_embedding: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('friendly_persons')
          .insert([payload])
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          return { data: normalizePerson(data), error: null };
        }
      } catch (err) {
        console.warn('Supabase create friendly person fallback:', err.message);
        // Return structured fallback
        const localPerson = {
          id: `FP-${Date.now().toString().slice(-4)}`,
          ...payload,
          fullName: payload.full_name,
          personCode: payload.person_code,
          photoUrl: payload.photo_url
        };
        const list = getLocalFriendlyPersons();
        saveLocalFriendlyPersons([localPerson, ...list]);
        return { data: normalizePerson(localPerson), error: null };
      }
    }

    const localPerson = {
      id: `FP-${Date.now().toString().slice(-4)}`,
      ...payload,
      fullName: payload.full_name,
      personCode: payload.person_code,
      photoUrl: payload.photo_url
    };
    const list = getLocalFriendlyPersons();
    saveLocalFriendlyPersons([localPerson, ...list]);
    return { data: normalizePerson(localPerson), error: null };
  },

  /**
   * Update existing friendly person
   */
  async update(id, personData, newPhotoFile = null) {
    let finalPhotoUrl = personData.photoUrl;

    if (newPhotoFile) {
      // If updating photo, remove old one if feasible
      if (personData.photoUrl) {
        await this.deletePhoto(personData.photoUrl);
      }
      finalPhotoUrl = await this.uploadPhoto(newPhotoFile, personData.personCode || personData.fullName);
    }

    const updates = {
      full_name: personData.fullName,
      person_code: personData.personCode,
      department: personData.department,
      role: personData.role,
      status: personData.status || 'FRIENDLY',
      photo_url: finalPhotoUrl,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('friendly_persons')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          return { data: normalizePerson(data), error: null };
        }
      } catch (err) {
        console.warn('Supabase update friendly person fallback:', err.message);
      }
    }

    const list = getLocalFriendlyPersons();
    const updatedList = list.map(p => {
      if (p.id === id || p.personCode === id || p.personId === id) {
        return { ...p, ...personData, photoUrl: finalPhotoUrl || p.photoUrl || p.avatar };
      }
      return p;
    });
    saveLocalFriendlyPersons(updatedList);
    const found = updatedList.find(p => p.id === id || p.personCode === id || p.personId === id);
    return { data: normalizePerson(found), error: null };
  },

  /**
   * Delete friendly person record
   */
  async delete(id, photoUrl = null) {
    if (photoUrl) {
      await this.deletePhoto(photoUrl);
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('friendly_persons')
          .delete()
          .eq('id', id);

        if (error) {
          throw new Error(error.message);
        }
      } catch (err) {
        console.warn('Supabase delete friendly person error:', err.message);
      }
    }

    const list = getLocalFriendlyPersons();
    const filtered = list.filter(p => p.id !== id && p.personCode !== id && p.personId !== id);
    saveLocalFriendlyPersons(filtered);
    return { success: true };
  }
};
