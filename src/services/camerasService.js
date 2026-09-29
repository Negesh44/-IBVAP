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

/**
 * Mask passwords embedded in RTSP URLs (e.g. rtsp://admin:secret123@192.168.1.10:554/stream)
 */
export function maskRtspUrl(url) {
  if (!url) return 'rtsp://***:***@192.168.10.x:554/live';
  try {
    return url.replace(/rtsp:\/\/([^:@]+):([^@]+)@/, 'rtsp://$1:••••••••@');
  } catch {
    return url;
  }
}

/**
 * Normalizes Supabase database row to standard UI Camera object
 */
function normalizeCamera(row) {
  return {
    id: row.id || `CAM-${row.camera_code || row.name?.replace(/\s+/g, '-').toUpperCase() || '01'}`,
    cameraCode: row.camera_code || row.id || 'BOP-001',
    name: row.name || 'Border Post Camera',
    location: row.location || 'North Sector',
    rtspUrl: row.rtsp_url || row.rtspUrl || 'rtsp://192.168.10.101:554/live/stream1',
    status: (row.status || 'ONLINE').toUpperCase(), // ONLINE | WARNING | OFFLINE | MAINTENANCE
    resolution: row.resolution || '1920x1080 (1080p)',
    fps: Number(row.fps) || 30,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.lastSeen || new Date().toISOString(),
    type: row.type || 'PTZ Thermal + Optical',
    sector: row.sector || row.location?.split('—')[0]?.trim() || 'North',
    detections24h: row.detections_24h || row.detections24h || 24,
    activeDetections: row.active_detections || row.activeDetections || [
      { id: "DET-104", type: "PERSON", category: "UNKNOWN", label: "Unknown Individual", confidence: 0.94, bbox: { x: 42, y: 35, w: 18, h: 42 }, time: "09:42:15" },
      { id: "DET-088", type: "FRIENDLY", category: "FRIENDLY", label: "Arun Kumar (BSF-1024)", confidence: 0.98, bbox: { x: 70, y: 40, w: 16, h: 38 }, time: "09:44:02" }
    ]
  };
}

export const camerasService = {
  /**
   * Fetch all cameras from Supabase
   */
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase cameras select error:', error.message);
          throw new Error(error.message);
        }

        if (data && data.length > 0) {
          return { data: data.map(normalizeCamera), error: null };
        }

        const local = getLocalCameras();
        return { data: data ? data.map(normalizeCamera) : local.map(normalizeCamera), error: null };
      } catch (err) {
        console.warn('cameras query fallback:', err);
        const local = getLocalCameras();
        return { data: local.map(normalizeCamera), error: err.message };
      }
    }
    const local = getLocalCameras();
    return { data: local.map(normalizeCamera), error: null };
  },

  /**
   * Fetch single camera by ID or code
   */
  async getById(id) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) return { data: normalizeCamera(data), error: null };
      } catch (err) {
        console.warn('Get camera by ID error:', err);
      }
    }
    const local = getLocalCameras();
    const found = local.find(c => c.id === id || c.cameraCode === id);
    return { data: found ? normalizeCamera(found) : null, error: null };
  },

  /**
   * Insert new camera record
   */
  async create(cameraData) {
    const payload = {
      camera_code: cameraData.cameraCode || cameraData.id || `BOP-${Math.floor(100 + Math.random() * 900)}`,
      name: cameraData.name,
      location: cameraData.location || 'North Sector',
      rtsp_url: cameraData.rtspUrl || cameraData.rtsp_url,
      status: (cameraData.status || 'ONLINE').toUpperCase(),
      resolution: cameraData.resolution || '1920x1080 (1080p)',
      fps: Number(cameraData.fps) || 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .insert([payload])
          .select()
          .single();

        if (error) throw new Error(error.message);
        if (data) return { data: normalizeCamera(data), error: null };
      } catch (err) {
        console.warn('Supabase camera insert fallback:', err.message);
        const localCam = {
          id: `CAM-${payload.camera_code}`,
          ...payload,
          cameraCode: payload.camera_code,
          rtspUrl: payload.rtsp_url
        };
        const list = getLocalCameras();
        saveLocalCameras([localCam, ...list]);
        return { data: normalizeCamera(localCam), error: null };
      }
    }

    const localCam = {
      id: `CAM-${payload.camera_code}`,
      ...payload,
      cameraCode: payload.camera_code,
      rtspUrl: payload.rtsp_url
    };
    const list = getLocalCameras();
    saveLocalCameras([localCam, ...list]);
    return { data: normalizeCamera(localCam), error: null };
  },

  /**
   * Update existing camera
   */
  async update(id, cameraData) {
    const updates = {
      camera_code: cameraData.cameraCode,
      name: cameraData.name,
      location: cameraData.location,
      rtsp_url: cameraData.rtspUrl,
      status: (cameraData.status || 'ONLINE').toUpperCase(),
      resolution: cameraData.resolution,
      fps: Number(cameraData.fps) || 30,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        if (data) return { data: normalizeCamera(data), error: null };
      } catch (err) {
        console.warn('Supabase camera update fallback:', err.message);
      }
    }

    const list = getLocalCameras();
    const updatedList = list.map(c => {
      if (c.id === id || c.cameraCode === id) {
        return { ...c, ...cameraData };
      }
      return c;
    });
    saveLocalCameras(updatedList);
    const found = updatedList.find(c => c.id === id || c.cameraCode === id);
    return { data: normalizeCamera(found), error: null };
  },

  /**
   * Toggle camera status (ONLINE <-> OFFLINE)
   */
  async toggleStatus(id) {
    const { data: current } = await this.getById(id);
    if (!current) return null;
    const nextStatus = current.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    return this.update(id, { ...current, status: nextStatus });
  },

  /**
   * Delete camera record
   */
  async delete(id) {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('cameras')
          .delete()
          .eq('id', id);

        if (error) throw new Error(error.message);
      } catch (err) {
        console.warn('Supabase delete camera error:', err.message);
      }
    }

    const list = getLocalCameras();
    const filtered = list.filter(c => c.id !== id && c.cameraCode !== id);
    saveLocalCameras(filtered);
    return { success: true };
  },

  /**
   * Subscribe to Supabase Realtime changes on cameras table
   */
  subscribeToChanges(onUpdate) {
    if (!isSupabaseConfigured) return () => {};

    try {
      const channel = supabase
        .channel('cameras-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cameras' }, (payload) => {
          if (onUpdate) onUpdate(payload);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime subscription not available:', err);
      return () => {};
    }
  }
};
