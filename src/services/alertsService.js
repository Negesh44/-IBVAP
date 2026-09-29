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

export function normalizeAlert(row) {
  return {
    id: row.id || `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
    type: row.alert_type || row.type || 'Virtual Fence Breach',
    alertType: row.alert_type || row.type || 'Virtual Fence Breach',
    severity: (row.severity || 'WARNING').toUpperCase(), // INFO | WARNING | CRITICAL
    camera: row.camera_name || row.camera_id || row.camera || 'BOP-001',
    cameraId: row.camera_id || row.cameraId || 'BOP-001',
    location: row.location || 'North Sector Perimeter',
    description: row.description || 'Intrusion alarm triggered along perimeter corridor.',
    status: (row.status || 'ACTIVE').toUpperCase(), // ACTIVE | ACKNOWLEDGED | RESOLVED
    evidenceUrl: row.evidence_url || row.evidenceUrl || row.snapshot_url || null,
    detectedAt: row.detected_at || row.created_at || row.timestamp || new Date().toISOString(),
    createdAt: row.created_at || row.detected_at || new Date().toISOString(),
    confidence: row.confidence || '94.5%',
    detectionTarget: row.detection_target || row.detectionTarget || 'Subject Incursion',
    assignedUnit: row.assigned_unit || row.assignedUnit || 'Rapid Response Unit 1',
    actionTaken: row.action_taken || row.actionTaken || null,
    threatLevel: row.threat_level || (row.severity === 'CRITICAL' ? 'High Risk' : row.severity === 'WARNING' ? 'Moderate Risk' : 'Low Risk')
  };
}

export const alertsService = {
  /**
   * Fetch all alerts from Supabase
   */
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase alerts select error:', error.message);
          throw new Error(error.message);
        }

        if (data && data.length > 0) {
          return data.map(normalizeAlert);
        }
      } catch (err) {
        console.warn('alerts query fallback:', err);
      }
    }
    const local = getLocalAlerts();
    return local.map(normalizeAlert);
  },

  /**
   * Fetch single alert by ID
   */
  async getById(id) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) return normalizeAlert(data);
      } catch (err) {
        console.warn('Alert getById error:', err);
      }
    }
    const list = getLocalAlerts();
    const match = list.find(a => a.id === id);
    return match ? normalizeAlert(match) : null;
  },

  /**
   * Update alert status (ACKNOWLEDGED / RESOLVED)
   */
  async updateStatus(id, newStatus, actionNote = '') {
    const validStatus = (newStatus || 'ACKNOWLEDGED').toUpperCase();

    if (isSupabaseConfigured) {
      try {
        const updatePayload = {
          status: validStatus,
          action_taken: actionNote || `Marked as ${validStatus} by operator`
        };

        const { data, error } = await supabase
          .from('alerts')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) return normalizeAlert(data);
      } catch (err) {
        console.warn('Supabase alert status update error:', err);
      }
    }

    const list = getLocalAlerts();
    const updated = list.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: validStatus,
          action_taken: actionNote || `Status updated to ${validStatus}`,
          actionTaken: actionNote || `Status updated to ${validStatus}`
        };
      }
      return a;
    });
    saveLocalAlerts(updated);
    const match = updated.find(a => a.id === id);
    return match ? normalizeAlert(match) : null;
  },

  /**
   * Create new alert
   */
  async create(alertData) {
    const payload = {
      alert_type: alertData.type || alertData.alertType || 'Virtual Fence Breach',
      camera_id: alertData.cameraId || alertData.camera_id || 'BOP-001',
      camera_name: alertData.camera || alertData.camera_name || 'North Post Camera',
      location: alertData.location || 'North Sector Perimeter',
      severity: (alertData.severity || 'CRITICAL').toUpperCase(),
      status: (alertData.status || 'ACTIVE').toUpperCase(),
      confidence: alertData.confidence || '95%',
      detection_target: alertData.detectionTarget || 'Subject Detection',
      description: alertData.description || 'Intrusion alarm triggered',
      assigned_unit: alertData.assignedUnit || 'QRT 1',
      action_taken: alertData.actionTaken || null,
      evidence_url: alertData.evidenceUrl || alertData.evidence_url || null,
      detected_at: alertData.detectedAt || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .insert([payload])
          .select()
          .single();

        if (!error && data) return normalizeAlert(data);
      } catch (err) {
        console.warn('Supabase alert insert error:', err);
      }
    }

    const localAlert = {
      id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
      ...payload
    };
    const list = getLocalAlerts();
    saveLocalAlerts([localAlert, ...list]);
    return normalizeAlert(localAlert);
  }
};
