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
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map(p => ({
            id: p.id,
            name: p.full_name || p.name || 'Officer',
            email: p.email || '',
            role: p.role || 'OPERATOR',
            status: p.status || 'ACTIVE',
            department: p.department || 'Border Defense Operations',
            badgeNumber: p.badge_number || p.badgeNumber || 'TAC-001',
            avatar: p.avatar_url || p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            lastLogin: p.last_login || p.updated_at || new Date().toISOString(),
            twoFactorEnabled: p.two_factor_enabled ?? true
          }));
        }
      } catch (err) {
        console.warn('Profiles Supabase query exception:', err);
      }
    }
    return getLocalUsers();
  },

  async getProfileById(userId) {
    if (isSupabaseConfigured && userId) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (!error && data) {
          return {
            id: data.id,
            name: data.full_name || data.name || 'Commander',
            email: data.email || '',
            role: data.role || 'ADMIN',
            department: data.department || 'Border Security Command HQ',
            badgeNumber: data.badge_number || data.badgeNumber || 'BSF-HQ-001',
            avatar: data.avatar_url || data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            station: data.station || 'HQ Northern Command',
            twoFactorEnabled: data.two_factor_enabled ?? true
          };
        }
      } catch (err) {
        console.warn('Get profile by ID error:', err);
      }
    }
    const local = getLocalUsers();
    return local.find(u => u.id === userId) || null;
  },

  async updateRole(id, role) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Update role Supabase error:', err);
      }
    }
    const list = getLocalUsers();
    const updated = list.map(u => u.id === id ? { ...u, role } : u);
    saveLocalUsers(updated);
    return updated.find(u => u.id === id);
  },

  async updateStatus(id, status) {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({ status }).eq('id', id);
      } catch {}
    }
    const list = getLocalUsers();
    const updated = list.map(u => u.id === id ? { ...u, status } : u);
    saveLocalUsers(updated);
    return updated.find(u => u.id === id);
  },

  async create(userData) {
    const newUser = {
      id: userData.id || `USR-${Date.now().toString().slice(-4)}`,
      full_name: userData.name || userData.fullName,
      email: userData.email,
      role: userData.role || 'OPERATOR',
      status: userData.status || 'ACTIVE',
      department: userData.department || 'Border Security Command',
      badge_number: userData.badgeNumber || `TAC-${Math.floor(100 + Math.random() * 900)}`,
      avatar_url: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('profiles').insert([newUser]).select().single();
        if (!error && data) {
          return {
            ...newUser,
            name: newUser.full_name,
            badgeNumber: newUser.badge_number,
            avatar: newUser.avatar_url
          };
        }
      } catch (err) {
        console.warn('Create profile Supabase error:', err);
      }
    }

    const list = getLocalUsers();
    const formatted = {
      ...newUser,
      name: newUser.full_name,
      badgeNumber: newUser.badge_number,
      avatar: newUser.avatar_url
    };
    saveLocalUsers([formatted, ...list]);
    return formatted;
  }
};

export const auditLogsService = {
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map(l => ({
            id: l.id,
            timestamp: l.created_at || l.timestamp || new Date().toISOString(),
            user: l.user_name || l.user || 'Commander',
            userRole: l.user_role || l.userRole || 'ADMIN',
            action: l.action || 'System Action',
            actionCode: l.action_code || l.actionCode || 'SYS_EVENT',
            resource: l.resource || 'System',
            ipAddress: l.ip_address || l.ipAddress || '10.240.12.88',
            device: l.device || 'Tactical Workstation Alpha',
            status: l.status || 'SUCCESS'
          }));
        }
      } catch (err) {
        console.warn('Audit logs Supabase query error:', err);
      }
    }
    return getLocalAuditLogs();
  },

  async log(action, resource, user = 'Commander Rawat', userRole = 'ADMIN', status = 'SUCCESS') {
    const newLog = {
      id: `LOG-${Math.floor(5500 + Math.random() * 4400)}`,
      user_name: user,
      user_role: userRole,
      action: action,
      action_code: action.toUpperCase().replace(/\s+/g, '_'),
      resource: resource,
      ip_address: '10.240.12.88',
      device: 'Tactical Workstation (IBVAP Web GUI)',
      status: status,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('audit_logs').insert([newLog]);
      } catch (err) {
        console.warn('Supabase audit log insert error:', err);
      }
    }

    const list = getLocalAuditLogs();
    const formatted = {
      ...newLog,
      timestamp: newLog.created_at,
      user: newLog.user_name,
      userRole: newLog.user_role,
      actionCode: newLog.action_code,
      ipAddress: newLog.ip_address
    };
    saveLocalAuditLogs([formatted, ...list]);
    return formatted;
  }
};
