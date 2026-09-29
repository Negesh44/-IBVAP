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

function formatCameraRow(row) {
  return {
    id: row.id || `CAM-${row.name?.replace(/\s+/g, '-').toUpperCase() || '01'}`,
    name: row.name || 'Border Post Cam',
    location: row.location || 'North Sector',
    sector: row.sector || 'North',
    rtspUrl: row.rtsp_url || row.rtspUrl || 'rtsp://192.168.10.101:554/live/stream1',
    status: row.status || 'ONLINE',
    type: row.type || 'PTZ Thermal + Optical',
    resolution: row.resolution || '3840x2160 (4K)',
    fps: row.fps || 30,
    bitrate: row.bitrate || '4.0 Mbps',
    lastSeen: row.last_seen || row.updated_at || new Date().toISOString(),
    detections24h: row.detections_24h || row.detections24h || 24,
    activeDetections: row.active_detections || row.activeDetections || [
      { id: "DET-104", type: "PERSON", category: "UNKNOWN", label: "Unknown Individual", confidence: 0.94, bbox: { x: 42, y: 35, w: 18, h: 42 }, time: "09:42:15" },
      { id: "DET-088", type: "FRIENDLY", category: "FRIENDLY", label: "Arun Kumar (BSF-1024)", confidence: 0.98, bbox: { x: 70, y: 40, w: 16, h: 38 }, time: "09:44:02" }
    ],
    coordinates: row.coordinates || '34.0837° N, 74.7973° E',
    elevation: row.elevation || '1,850m',
    nightVision: row.night_vision ?? true,
    thermalMode: row.thermal_mode ?? false,
    zoneType: row.zone_type || 'FENCE_PERIMETER'
  };
}

export const camerasService = {
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .select('*')
          .order('name');

        if (!error && data && data.length > 0) {
          return data.map(formatCameraRow);
        }
      } catch (err) {
        console.warn('Supabase cameras query error:', err);
      }
    }
    return getLocalCameras();
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) return formatCameraRow(data);
      } catch (err) {
        console.warn('Camera getById error:', err);
      }
    }
    const list = getLocalCameras();
    return list.find(c => c.id === id) || null;
  },

  async create(cameraData) {
    const cameraPayload = {
      name: cameraData.name,
      location: cameraData.location,
      sector: cameraData.sector || 'North',
      rtsp_url: cameraData.rtspUrl || cameraData.rtsp_url,
      type: cameraData.type || 'PTZ Thermal + Optical',
      status: cameraData.status || 'ONLINE',
      resolution: cameraData.resolution || '3840x2160 (4K)',
      fps: Number(cameraData.fps) || 30,
      bitrate: '4.2 Mbps',
      coordinates: cameraData.coordinates || '34.0850° N, 74.8000° E',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .insert([cameraPayload])
          .select()
          .single();

        if (!error && data) return formatCameraRow(data);
      } catch (err) {
        console.warn('Supabase camera insert error:', err);
      }
    }

    const localCamera = {
      id: cameraData.id || `CAM-${cameraData.name?.replace(/\s+/g, '-').toUpperCase() || '01'}`,
      ...cameraData,
      status: cameraData.status || 'ONLINE',
      detections24h: 0,
      activeDetections: [],
      lastSeen: new Date().toISOString()
    };
    delete localCamera.password;

    const list = getLocalCameras();
    saveLocalCameras([...list, localCamera]);
    return localCamera;
  },

  async update(id, updates) {
    const supabaseUpdates = {
      name: updates.name,
      location: updates.location,
      sector: updates.sector,
      status: updates.status,
      type: updates.type,
      resolution: updates.resolution,
      fps: updates.fps ? Number(updates.fps) : undefined,
      rtsp_url: updates.rtspUrl || updates.rtsp_url,
      last_seen: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .update(supabaseUpdates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) return formatCameraRow(data);
      } catch (err) {
        console.warn('Supabase camera update error:', err);
      }
    }

    const list = getLocalCameras();
    const updated = list.map(c => c.id === id ? { ...c, ...updates } : c);
    saveLocalCameras(updated);
    return updated.find(c => c.id === id);
  },

  async toggleStatus(id) {
    const list = await this.getAll();
    const current = list.find(c => c.id === id);
    if (!current) return null;
    const nextStatus = current.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    return this.update(id, { status: nextStatus });
  },

  async delete(id) {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('cameras').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase camera delete error:', err);
      }
    }

    const list = getLocalCameras();
    const filtered = list.filter(c => c.id !== id);
    saveLocalCameras(filtered);
    return true;
  }
};
