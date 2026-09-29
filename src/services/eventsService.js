import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_EVENTS } from '../data/mockData';

const LOCAL_STORAGE_KEY = 'ibvap_events';

function getLocalEvents() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return MOCK_EVENTS;
}

function saveLocalEvents(list) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

export const eventsService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('events').select('*').order('timestamp', { ascending: false });
      if (!error && data && data.length > 0) return data;
    }
    return getLocalEvents();
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (!error && data) return data;
    }
    const list = getLocalEvents();
    return list.find(e => e.id === id) || null;
  },

  async create(eventData) {
    const newEvent = {
      id: `EVT-${Math.floor(9000 + Math.random() * 999)}`,
      timestamp: new Date().toISOString(),
      status: 'VERIFIED',
      ...eventData
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('events').insert([newEvent]).select().single();
      if (!error && data) return data;
    }

    const list = getLocalEvents();
    const updated = [newEvent, ...list];
    saveLocalEvents(updated);
    return newEvent;
  }
};
