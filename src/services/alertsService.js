import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_ALERTS } from '../data/mockData';

const LOCAL_STORAGE_KEY = 'ibvap_alerts';

function getLocalAlerts() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return MOCK_ALERTS;
}

function saveLocalAlerts(list) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

export const alertsService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('alerts').select('*').order('timestamp', { ascending: false });
      if (!error && data && data.length > 0) return data;
    }
    return getLocalAlerts();
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('alerts').select('*').eq('id', id).single();
      if (!error && data) return data;
    }
    const list = getLocalAlerts();
    return list.find(a => a.id === id) || null;
  },

  async updateStatus(id, newStatus, actionNote = '') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('alerts').update({ 
        status: newStatus,
        actionTaken: actionNote ? actionNote : undefined 
      }).eq('id', id).select().single();
      if (!error && data) return data;
    }

    const list = getLocalAlerts();
    const updated = list.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: newStatus,
          actionTaken: actionNote ? `${a.actionTaken ? a.actionTaken + ' | ' : ''}${actionNote}` : a.actionTaken
        };
      }
      return a;
    });
    saveLocalAlerts(updated);
    return updated.find(a => a.id === id);
  },

  async create(alertData) {
    const newAlert = {
      id: `ALT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      severity: 'CRITICAL',
      ...alertData
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('alerts').insert([newAlert]).select().single();
      if (!error && data) return data;
    }

    const list = getLocalAlerts();
    const updated = [newAlert, ...list];
    saveLocalAlerts(updated);
    return newAlert;
  }
};
