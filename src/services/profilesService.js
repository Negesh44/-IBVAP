import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_USERS, MOCK_AUDIT_LOGS } from '../data/mockData';

const LOCAL_USERS_KEY = 'ibvap_users';
const LOCAL_AUDIT_KEY = 'ibvap_audit_logs';

function getLocalUsers() {
  const saved = localStorage.getItem(LOCAL_USERS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return MOCK_USERS;
}

function saveLocalUsers(list) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
}

function getLocalAuditLogs() {
  const saved = localStorage.getItem(LOCAL_AUDIT_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return MOCK_AUDIT_LOGS;
}

function saveLocalAuditLogs(list) {
  localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(list));
}

export const profilesService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (!error && data && data.length > 0) return data;
    }
    return getLocalUsers();
  },

  async updateRole(id, role) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select().single();
      if (!error && data) return data;
    }
    const list = getLocalUsers();
    const updated = list.map(u => u.id === id ? { ...u, role } : u);
    saveLocalUsers(updated);
    return updated.find(u => u.id === id);
  },

  async updateStatus(id, status) {
    const list = getLocalUsers();
    const updated = list.map(u => u.id === id ? { ...u, status } : u);
    saveLocalUsers(updated);
    return updated.find(u => u.id === id);
  },

  async create(userData) {
    const newUser = {
      id: `USR-${Date.now().toString().slice(-3)}`,
      lastLogin: new Date().toISOString(),
      twoFactorEnabled: false,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      ...userData
    };
    const list = getLocalUsers();
    const updated = [...list, newUser];
    saveLocalUsers(updated);
    return newUser;
  }
};

export const auditLogsService = {
  async getAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
      if (!error && data && data.length > 0) return data;
    }
    return getLocalAuditLogs();
  },

  async log(action, resource, user = 'Operator', userRole = 'OPERATOR', status = 'SUCCESS') {
    const newLog = {
      id: `LOG-${Math.floor(5500 + Math.random() * 4400)}`,
      timestamp: new Date().toISOString(),
      user,
      userRole,
      action,
      actionCode: action.toUpperCase().replace(/\s+/g, '_'),
      resource,
      ipAddress: '10.240.12.88',
      device: 'Tactical Workstation (IBVAP Web GUI)',
      status
    };

    if (isSupabaseConfigured) {
      await supabase.from('audit_logs').insert([newLog]);
    }

    const list = getLocalAuditLogs();
    const updated = [newLog, ...list];
    saveLocalAuditLogs(updated);
    return newLog;
  }
};
