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
  return MOCK_USERS.map(u => ({
    ...u,
    status: u.status || 'ACTIVE',
    createdAt: u.createdAt || '2026-01-10T08:00:00.000Z'
  }));
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
  return MOCK_AUDIT_LOGS.map(l => ({
    id: l.id,
    userId: l.userId || l.user_id || 'USR-001',
    user: l.user || l.user_name || 'Col. Sanjeev Rawat',
    userRole: l.userRole || l.user_role || 'ADMIN',
    action: l.action || 'System Action',
    resourceType: l.resourceType || l.resource_type || 'System',
    resourceId: l.resourceId || l.resource_id || '',
    resource: l.resource || l.resource_type || 'System',
    details: l.details || l.resource || 'System event recorded',
    timestamp: l.timestamp || l.created_at || new Date().toISOString(),
    createdAt: l.created_at || l.timestamp || new Date().toISOString(),
    ipAddress: l.ipAddress || l.ip_address || '10.240.10.01',
    device: l.device || 'Tactical Command Terminal',
    status: l.status || 'SUCCESS'
  }));
}

function saveLocalAuditLogs(list) {
  localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(list));
}

export const profilesService = {
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(p => ({
            id: p.id,
            name: p.full_name || p.name || 'Officer',
            fullName: p.full_name || p.name || 'Officer',
            email: p.email || '',
            role: (p.role || 'OPERATOR').toUpperCase(),
            status: (p.status || 'ACTIVE').toUpperCase(),
            department: p.department || 'Border Defense Operations',
            badgeNumber: p.badge_number || p.badgeNumber || 'TAC-001',
            avatar: p.avatar_url || p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            createdAt: p.created_at || new Date().toISOString(),
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
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            name: data.full_name || data.name || 'Commander',
            fullName: data.full_name || data.name || 'Commander',
            email: data.email || '',
            role: (data.role || 'ADMIN').toUpperCase(),
            status: (data.status || 'ACTIVE').toUpperCase(),
            department: data.department || 'Border Security Command HQ',
            badgeNumber: data.badge_number || data.badgeNumber || 'BSF-HQ-001',
            avatar: data.avatar_url || data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            station: data.station || 'HQ Northern Command',
            createdAt: data.created_at || new Date().toISOString(),
            lastLogin: data.last_login || data.updated_at || new Date().toISOString(),
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
    const formattedRole = role.toUpperCase();
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ role: formattedRole })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Update role Supabase error:', err);
      }
    }
    const list = getLocalUsers();
    const updated = list.map(u => u.id === id ? { ...u, role: formattedRole } : u);
    saveLocalUsers(updated);
    return updated.find(u => u.id === id);
  },

  async updateStatus(id, status) {
    const formattedStatus = status.toUpperCase();
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('profiles')
          .update({ status: formattedStatus })
          .eq('id', id);
      } catch (err) {
        console.warn('Update status Supabase error:', err);
      }
    }
    const list = getLocalUsers();
    const updated = list.map(u => u.id === id ? { ...u, status: formattedStatus } : u);
    saveLocalUsers(updated);
    return updated.find(u => u.id === id);
  },

  async updateProfile(id, updates) {
    const dbPayload = {};
    if (updates.name || updates.fullName) dbPayload.full_name = updates.name || updates.fullName;
    if (updates.email) dbPayload.email = updates.email;
    if (updates.department) dbPayload.department = updates.department;
    if (updates.station) dbPayload.station = updates.station;
    if (updates.avatar) dbPayload.avatar_url = updates.avatar;

    if (isSupabaseConfigured && id) {
      try {
        await supabase
          .from('profiles')
          .update(dbPayload)
          .eq('id', id);
      } catch (err) {
        console.warn('Update profile Supabase error:', err);
      }
    }
    const list = getLocalUsers();
    const updated = list.map(u => u.id === id ? { ...u, ...updates } : u);
    saveLocalUsers(updated);
    return updated.find(u => u.id === id);
  },

  async create(userData) {
    const newUser = {
      id: userData.id || `USR-${Date.now().toString().slice(-4)}`,
      full_name: userData.name || userData.fullName || 'Officer',
      email: userData.email,
      role: (userData.role || 'OPERATOR').toUpperCase(),
      status: (userData.status || 'ACTIVE').toUpperCase(),
      department: userData.department || 'Border Security Command',
      badge_number: userData.badgeNumber || `TAC-${Math.floor(100 + Math.random() * 900)}`,
      avatar_url: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .insert([newUser])
          .select()
          .single();
        if (!error && data) {
          return {
            ...newUser,
            name: newUser.full_name,
            fullName: newUser.full_name,
            badgeNumber: newUser.badge_number,
            avatar: newUser.avatar_url,
            createdAt: newUser.created_at
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
      fullName: newUser.full_name,
      badgeNumber: newUser.badge_number,
      avatar: newUser.avatar_url,
      createdAt: newUser.created_at
    };
    saveLocalUsers([formatted, ...list]);
    return formatted;
  }
};

export const auditLogsService = {
  async getAll() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(l => ({
            id: l.id || `LOG-${l.created_at?.slice(-4) || '0000'}`,
            userId: l.user_id || 'USR-001',
            user: l.user_name || l.user || 'Officer',
            userRole: l.user_role || l.userRole || 'ADMIN',
            action: l.action || 'System Action',
            resourceType: l.resource_type || l.resourceType || 'System',
            resourceId: l.resource_id || l.resourceId || '',
            resource: l.resource || (l.resource_id ? `${l.resource_type || 'Resource'}: ${l.resource_id}` : (l.resource_type || 'System')),
            details: typeof l.details === 'object' ? JSON.stringify(l.details, null, 2) : (l.details || 'Operational record logged'),
            ipAddress: l.ip_address || l.ipAddress || '10.240.12.88',
            device: l.device || 'Command Workstation Alpha',
            status: l.status || 'SUCCESS',
            timestamp: l.created_at || l.timestamp || new Date().toISOString(),
            createdAt: l.created_at || l.timestamp || new Date().toISOString()
          }));
        }
      } catch (err) {
        console.warn('Audit logs Supabase query error:', err);
      }
    }
    return getLocalAuditLogs();
  },

  async log(actionOrOptions, resourceType = 'System', resourceId = '', details = '', user = 'Commander Rawat', userRole = 'ADMIN', userId = null) {
    let action = actionOrOptions;
    let rType = resourceType;
    let rId = resourceId;
    let det = details;
    let uName = user;
    let uRole = userRole;
    let uId = userId;

    if (typeof actionOrOptions === 'object' && actionOrOptions !== null) {
      action = actionOrOptions.action || 'System Action';
      rType = actionOrOptions.resourceType || actionOrOptions.resource_type || 'System';
      rId = actionOrOptions.resourceId || actionOrOptions.resource_id || '';
      det = actionOrOptions.details || '';
      uName = actionOrOptions.user || actionOrOptions.userName || actionOrOptions.user_name || 'Commander Rawat';
      uRole = actionOrOptions.userRole || actionOrOptions.user_role || 'ADMIN';
      uId = actionOrOptions.userId || actionOrOptions.user_id || null;
    }

    const newLog = {
      id: `LOG-${Math.floor(5500 + Math.random() * 4400)}`,
      user_id: uId || 'USR-001',
      action: action,
      resource_type: rType,
      resource_id: rId || '',
      details: typeof det === 'object' ? JSON.stringify(det) : (det || `${action} on ${rType} ${rId}`.trim()),
      user_name: uName,
      user_role: uRole,
      ip_address: '10.240.12.88',
      device: 'Tactical Command Terminal (IBVAP)',
      status: 'SUCCESS',
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
      id: newLog.id,
      userId: newLog.user_id,
      user: newLog.user_name,
      userRole: newLog.user_role,
      action: newLog.action,
      resourceType: newLog.resource_type,
      resourceId: newLog.resource_id,
      resource: newLog.resource_id ? `${newLog.resource_type}: ${newLog.resource_id}` : newLog.resource_type,
      details: newLog.details,
      ipAddress: newLog.ip_address,
      device: newLog.device,
      status: newLog.status,
      timestamp: newLog.created_at,
      createdAt: newLog.created_at
    };
    saveLocalAuditLogs([formatted, ...list]);
    return formatted;
  }
};
