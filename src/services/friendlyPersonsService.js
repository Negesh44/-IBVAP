import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { storageService } from './storageService';
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

function formatSupabaseRow(row) {
  return {
    id: row.id,
    personId: row.person_code || row.personId || row.id,
    fullName: row.full_name || row.fullName || 'Authorized Personnel',
    department: row.department || 'Border Security Force',
    role: row.role || 'Patrol Officer',
    rank: row.rank || 'Officer',
    status: row.status || 'FRIENDLY',
    unit: row.unit || '142nd Battalion',
    station: row.station || 'BOP North Sector',
    faceRegistered: row.face_registered ?? true,
    confidenceScore: row.confidence_score || row.confidenceScore || 0.985,
    embeddingHash: row.embedding_hash || row.embeddingHash || 'f6e8a0b2...89cf',
    clearanceLevel: row.clearance_level || row.clearanceLevel || 'Level 3 (Operational)',
    registeredOn: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2025-11-12',
    lastVerified: row.last_verified || '2026-09-29 09:44:02',
    avatar: row.photo_url || row.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    badgeNumber: row.badge_number || row.badgeNumber || row.person_code || 'BSF-1024',
    phone: row.phone || '+91 98123 45670',
    email: row.email || 'personnel@bsf.gov.in'
  };
}

export const friendlyPersonsService = {
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('friendly_persons')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(formatSupabaseRow);
        }
      } catch (err) {
        console.warn('Supabase friendly_persons query error:', err);
      }
    }
    return getLocalFriendlyPersons();
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('friendly_persons')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) return formatSupabaseRow(data);
      } catch (err) {
        console.warn('Friendly person getById error:', err);
      }
    }
    const list = getLocalFriendlyPersons();
    return list.find(p => p.id === id || p.personId === id) || null;
  },

  async create(personData, photoFile = null) {
    let finalPhotoUrl = personData.avatar;

    // Upload to 'friendly-persons' Supabase Storage bucket if file provided
    if (photoFile) {
      const uploadedUrl = await storageService.uploadFriendlyPersonPhoto(
        photoFile,
        personData.personId || personData.personCode || personData.fullName
      );
      if (uploadedUrl) {
        finalPhotoUrl = uploadedUrl;
      }
    }

    const newPersonPayload = {
      full_name: personData.fullName || personData.full_name,
      person_code: personData.personId || personData.personCode || `BSF-${Math.floor(1000 + Math.random() * 9000)}`,
      department: personData.department || 'Border Security Force',
      role: personData.role || 'Patrol Officer',
      rank: personData.rank || 'Officer',
      status: 'FRIENDLY',
      unit: personData.unit || '142nd Battalion',
      station: personData.station || 'Frontier Post',
      photo_url: finalPhotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      clearance_level: personData.clearanceLevel || 'Level 3 (Operational)',
      face_registered: true,
      confidence_score: 0.99,
      embedding_hash: `${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('friendly_persons')
          .insert([newPersonPayload])
          .select()
          .single();

        if (!error && data) {
          return formatSupabaseRow(data);
        }
      } catch (err) {
        console.warn('Supabase friendly_persons insert error:', err);
      }
    }

    const localPerson = {
      id: `FP-${Date.now().toString().slice(-4)}`,
      personId: newPersonPayload.person_code,
      fullName: newPersonPayload.full_name,
      department: newPersonPayload.department,
      role: newPersonPayload.role,
      rank: newPersonPayload.rank,
      status: 'FRIENDLY',
      unit: newPersonPayload.unit,
      station: newPersonPayload.station,
      avatar: newPersonPayload.photo_url,
      clearanceLevel: newPersonPayload.clearance_level,
      faceRegistered: true,
      confidenceScore: 0.99,
      embeddingHash: newPersonPayload.embedding_hash,
      registeredOn: new Date().toISOString().split('T')[0],
      lastVerified: 'Just Enrolled'
    };

    const list = getLocalFriendlyPersons();
    saveLocalFriendlyPersons([localPerson, ...list]);
    return localPerson;
  },

  async update(id, updates, photoFile = null) {
    let finalPhotoUrl = updates.avatar || updates.photo_url;

    if (photoFile) {
      const uploadedUrl = await storageService.uploadFriendlyPersonPhoto(
        photoFile,
        updates.personId || updates.fullName
      );
      if (uploadedUrl) {
        finalPhotoUrl = uploadedUrl;
      }
    }

    const supabaseUpdates = {
      full_name: updates.fullName || updates.full_name,
      person_code: updates.personId || updates.person_code,
      department: updates.department,
      role: updates.role,
      rank: updates.rank,
      station: updates.station,
      clearance_level: updates.clearanceLevel || updates.clearance_level,
      photo_url: finalPhotoUrl
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('friendly_persons')
          .update(supabaseUpdates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) return formatSupabaseRow(data);
      } catch (err) {
        console.warn('Supabase friendly_persons update error:', err);
      }
    }

    const list = getLocalFriendlyPersons();
    const updated = list.map(p => p.id === id ? { ...p, ...updates, avatar: finalPhotoUrl || p.avatar } : p);
    saveLocalFriendlyPersons(updated);
    return updated.find(p => p.id === id);
  },

  async delete(id) {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('friendly_persons').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase friendly_persons delete error:', err);
      }
    }

    const list = getLocalFriendlyPersons();
    const filtered = list.filter(p => p.id !== id);
    saveLocalFriendlyPersons(filtered);
    return true;
  }
};
