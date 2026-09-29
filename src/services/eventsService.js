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

export function normalizeEvent(row) {
  return {
    id: row.id || `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
    eventType: row.event_type || row.eventType || 'Person Detection',
    cameraId: row.camera_id || row.cameraId || row.camera || 'BOP-001',
    camera: row.camera_name || row.camera_id || row.camera || 'BOP-001',
    personId: row.person_id || row.personId || null,
    objectType: row.object_type || row.objectType || row.targetType || 'PERSON',
    targetType: row.object_type || row.targetType || 'PERSON',
    objectId: row.object_id || row.objectId || row.targetId || `OBJ-${Math.floor(100 + Math.random() * 900)}`,
    targetId: row.object_id || row.targetId || `OBJ-${Math.floor(100 + Math.random() * 900)}`,
    confidence: typeof row.confidence === 'number' ? `${Math.round(row.confidence <= 1 ? row.confidence * 100 : row.confidence)}%` : (row.confidence || '95.0%'),
    location: row.location || 'North Sector Perimeter',
    evidenceUrl: row.evidence_url || row.evidenceUrl || null,
    metadata: row.metadata || { sensor: 'Thermal Optic', track_length_sec: 14 },
    detectedAt: row.detected_at || row.created_at || row.timestamp || new Date().toISOString(),
    createdAt: row.created_at || row.detected_at || new Date().toISOString(),
    severity: (row.severity || 'INFO').toUpperCase(),
    status: (row.status || 'VERIFIED').toUpperCase(),
    actionTaken: row.action_taken || row.actionTaken || 'Logged to Security Archive',
    operator: row.operator || 'AI Pipeline YOLOv8'
  };
}

export const eventsService = {
  /**
   * Fetch all events from Supabase
   */
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase events select error:', error.message);
          throw new Error(error.message);
        }

        if (data && data.length > 0) {
          return data.map(normalizeEvent);
        }
      } catch (err) {
        console.warn('Supabase events query error:', err);
      }
    }
    const local = getLocalEvents();
    return local.map(normalizeEvent);
  },

  /**
   * Fetch single event by ID
   */
  async getById(id) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) return normalizeEvent(data);
      } catch (err) {
        console.warn('Event getById error:', err);
      }
    }
    const list = getLocalEvents();
    const match = list.find(e => e.id === id);
    return match ? normalizeEvent(match) : null;
  },

  /**
   * Create new event
   */
  async create(eventData) {
    const payload = {
      event_type: eventData.eventType || eventData.event_type || 'Person Detection',
      camera_id: eventData.cameraId || eventData.camera_id || 'BOP-001',
      camera_name: eventData.camera || eventData.camera_name || 'BOP-001 Forward Post',
      person_id: eventData.personId || eventData.person_id || null,
      object_type: eventData.objectType || eventData.object_type || eventData.targetType || 'PERSON',
      object_id: eventData.objectId || eventData.object_id || eventData.targetId || `OBJ-${Math.floor(100 + Math.random() * 900)}`,
      confidence: eventData.confidence || '96.0%',
      location: eventData.location || 'North Sector',
      evidence_url: eventData.evidenceUrl || eventData.evidence_url || null,
      metadata: eventData.metadata || { pipeline: 'ByteTrack+YOLOv8', fps: 30 },
      severity: (eventData.severity || 'INFO').toUpperCase(),
      status: (eventData.status || 'VERIFIED').toUpperCase(),
      action_taken: eventData.actionTaken || eventData.action_taken || 'Logged',
      operator: eventData.operator || 'AI Pipeline',
      detected_at: eventData.detectedAt || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('events')
          .insert([payload])
          .select()
          .single();

        if (!error && data) return normalizeEvent(data);
      } catch (err) {
        console.warn('Supabase event insert error:', err);
      }
    }

    const localEvent = {
      id: `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
      ...payload
    };
    const list = getLocalEvents();
    saveLocalEvents([localEvent, ...list]);
    return normalizeEvent(localEvent);
  }
};
