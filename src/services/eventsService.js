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

function formatEventRow(row) {
  return {
    id: row.id || `EVT-${Math.floor(9000 + Math.random() * 999)}`,
    eventType: row.event_type || row.eventType || 'Perimeter Observation',
    camera: row.camera || row.camera_name || 'BOP-01 Forward Post',
    timestamp: row.created_at || row.timestamp || new Date().toISOString(),
    targetId: row.target_id || row.targetId || 'SUBJ-01',
    targetType: row.target_type || row.targetType || 'PERSON',
    severity: row.severity || 'INFO',
    status: row.status || 'VERIFIED',
    location: row.location || 'North Sector',
    confidence: row.confidence || '96.0%',
    evidenceType: row.evidence_type || row.evidenceType || 'Thermal High-Res Frame Capture',
    actionTaken: row.action_taken || row.actionTaken || 'Recorded in tactical journal',
    operator: row.operator || 'AI Pipeline',
    coordinates: row.coordinates || '34.0837° N, 74.7973° E'
  };
}

export const eventsService = {
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(formatEventRow);
        }
      } catch (err) {
        console.warn('Supabase events query error:', err);
      }
    }
    return getLocalEvents();
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) return formatEventRow(data);
      } catch (err) {
        console.warn('Event getById error:', err);
      }
    }
    const list = getLocalEvents();
    return list.find(e => e.id === id) || null;
  },

  async create(eventData) {
    const payload = {
      event_type: eventData.eventType || eventData.event_type,
      camera_name: eventData.camera || eventData.camera_name,
      target_id: eventData.targetId || eventData.target_id,
      target_type: eventData.targetType || eventData.target_type || 'PERSON',
      severity: eventData.severity || 'INFO',
      status: eventData.status || 'VERIFIED',
      location: eventData.location,
      confidence: eventData.confidence || '95.0%',
      evidence_type: eventData.evidenceType || eventData.evidence_type,
      action_taken: eventData.actionTaken || eventData.action_taken,
      operator: eventData.operator || 'AI Pipeline',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('events')
          .insert([payload])
          .select()
          .single();

        if (!error && data) return formatEventRow(data);
      } catch (err) {
        console.warn('Supabase event insert error:', err);
      }
    }

    const localEvent = {
      id: `EVT-${Math.floor(9000 + Math.random() * 999)}`,
      timestamp: new Date().toISOString(),
      status: 'VERIFIED',
      ...eventData
    };
    const list = getLocalEvents();
    saveLocalEvents([localEvent, ...list]);
    return localEvent;
  }
};
