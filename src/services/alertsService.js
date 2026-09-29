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

function formatAlertRow(row) {
  return {
    id: row.id || `ALT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    type: row.type || row.alert_type || 'Virtual Fence Breach',
    camera: row.camera || row.camera_name || 'BOP-01 Forward Post',
    cameraId: row.camera_id || row.cameraId || 'CAM-BOP-01',
    location: row.location || 'North Sector Perimeter',
    time: row.created_at ? new Date(row.created_at).toLocaleTimeString('en-US', { hour12: false }) : (row.time || '09:46:01'),
    timestamp: row.created_at || row.timestamp || new Date().toISOString(),
    severity: row.severity || 'CRITICAL',
    status: row.status || 'ACTIVE',
    confidence: row.confidence || '94.2%',
    detectionTarget: row.detection_target || row.detectionTarget || 'Unknown Individual',
    description: row.description || 'Intrusion alarm triggered along border wire.',
    assignedUnit: row.assigned_unit || row.assignedUnit || 'QRT Alpha 1',
    snapshotUrl: row.snapshot_url || row.snapshotUrl || '/evidence/breach-01.jpg',
    actionTaken: row.action_taken || row.actionTaken || 'Sentry notified',
    threatLevel: row.threat_level || row.threatLevel || 'High Risk'
  };
}

export const alertsService = {
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(formatAlertRow);
        }
      } catch (err) {
        console.warn('Supabase alerts query error:', err);
      }
    }
    return getLocalAlerts();
  },

  async getById(id) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) return formatAlertRow(data);
      } catch (err) {
        console.warn('Alert getById error:', err);
      }
    }
    const list = getLocalAlerts();
    return list.find(a => a.id === id) || null;
  },

  async updateStatus(id, newStatus, actionNote = '') {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .update({
            status: newStatus,
            action_taken: actionNote ? actionNote : undefined
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) return formatAlertRow(data);
      } catch (err) {
        console.warn('Supabase alert status update error:', err);
      }
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
    const payload = {
      alert_type: alertData.type,
      camera_name: alertData.camera,
      camera_id: alertData.cameraId,
      location: alertData.location,
      severity: alertData.severity || 'CRITICAL',
      status: alertData.status || 'ACTIVE',
      confidence: alertData.confidence || '94%',
      detection_target: alertData.detectionTarget || 'Unknown Person',
      description: alertData.description || 'Intrusion detected',
      assigned_unit: alertData.assignedUnit || 'QRT 1',
      action_taken: alertData.actionTaken || 'Dispatched siren',
      threat_level: alertData.threatLevel || 'High Risk',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .insert([payload])
          .select()
          .single();

        if (!error && data) return formatAlertRow(data);
      } catch (err) {
        console.warn('Supabase alert insert error:', err);
      }
    }

    const localAlert = {
      id: `ALT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      timestamp: new Date().toISOString(),
      ...alertData
    };
    const list = getLocalAlerts();
    saveLocalAlerts([localAlert, ...list]);
    return localAlert;
  }
};
