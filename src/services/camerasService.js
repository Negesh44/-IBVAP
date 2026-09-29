import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_CAMERAS } from '../data/mockData';

const LOCAL_STORAGE_KEY = 'ibvap_cameras';

function getLocalCameras() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return MOCK_CAMERAS;
}

function saveLocalCameras(list) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
}

export const camerasService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('cameras').select('*').order('name');
      if (!error && data && data.length > 0) return data;
    }
    return getLocalCameras();
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('cameras').select('*').eq('id', id).single();
      if (!error && data) return data;
    }
    const list = getLocalCameras();
    return list.find(c => c.id === id) || null;
  },

  async create(cameraData) {
    // Note: cameraData.password is kept strictly confidential and not exposed
    const newCamera = {
      id: cameraData.id || `CAM-${cameraData.name.replace(/\s+/g, '-').toUpperCase()}`,
      status: cameraData.status || 'ONLINE',
      resolution: cameraData.resolution || '1920x1080 (1080p)',
      fps: cameraData.fps || 30,
      bitrate: '3.8 Mbps',
      lastSeen: new Date().toISOString(),
      detections24h: 0,
      activeDetections: [],
      type: cameraData.type || 'PTZ Optical + Infrared',
      sector: cameraData.sector || 'North',
      coordinates: cameraData.coordinates || '34.0850° N, 74.8000° E',
      elevation: cameraData.elevation || '1,800m',
      nightVision: true,
      thermalMode: false,
      ...cameraData
    };
    // Ensure password is not stored in public client memory
    delete newCamera.password;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('cameras').insert([newCamera]).select().single();
      if (!error && data) return data;
    }

    const list = getLocalCameras();
    const updated = [...list, newCamera];
    saveLocalCameras(updated);
    return newCamera;
  },

  async update(id, updates) {
    const safeUpdates = { ...updates };
    delete safeUpdates.password;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('cameras').update(safeUpdates).eq('id', id).select().single();
      if (!error && data) return data;
    }

    const list = getLocalCameras();
    const updated = list.map(c => c.id === id ? { ...c, ...safeUpdates } : c);
    saveLocalCameras(updated);
    return updated.find(c => c.id === id);
  },

  async toggleStatus(id) {
    const list = getLocalCameras();
    const current = list.find(c => c.id === id);
    if (!current) return null;
    const nextStatus = current.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    return this.update(id, { status: nextStatus, lastSeen: new Date().toISOString() });
  },

  async delete(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('cameras').delete().eq('id', id);
      if (!error) return true;
    }

    const list = getLocalCameras();
    const filtered = list.filter(c => c.id !== id);
    saveLocalCameras(filtered);
    return true;
  }
};
