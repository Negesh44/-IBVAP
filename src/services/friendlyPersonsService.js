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

export const friendlyPersonsService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('friendly_persons').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    }
    return getLocalFriendlyPersons();
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('friendly_persons').select('*').eq('id', id).single();
      if (!error && data) return data;
    }
    const list = getLocalFriendlyPersons();
    return list.find(p => p.id === id || p.personId === id) || null;
  },

  async create(personData) {
    const newPerson = {
      id: `FP-${Date.now().toString().slice(-4)}`,
      registeredOn: new Date().toISOString().split('T')[0],
      lastVerified: 'Not yet detected',
      confidenceScore: 0.99,
      faceRegistered: true,
      embeddingHash: `${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`,
      avatar: personData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'FRIENDLY',
      ...personData
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('friendly_persons').insert([newPerson]).select().single();
      if (!error && data) return data;
    }

    const list = getLocalFriendlyPersons();
    const updated = [newPerson, ...list];
    saveLocalFriendlyPersons(updated);
    return newPerson;
  },

  async update(id, updates) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('friendly_persons').update(updates).eq('id', id).select().single();
      if (!error && data) return data;
    }

    const list = getLocalFriendlyPersons();
    const updated = list.map(p => p.id === id ? { ...p, ...updates } : p);
    saveLocalFriendlyPersons(updated);
    return updated.find(p => p.id === id);
  },

  async delete(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('friendly_persons').delete().eq('id', id);
      if (!error) return true;
    }

    const list = getLocalFriendlyPersons();
    const filtered = list.filter(p => p.id !== id);
    saveLocalFriendlyPersons(filtered);
    return true;
  }
};
