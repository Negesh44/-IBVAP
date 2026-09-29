import React, { createContext, useContext, useState, useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { auditLogsService } from '../services/auditLogsService';

const AuthContext = createContext(null);

const DEFAULT_USER = {
  id: 'USR-001',
  name: 'Col. Sanjeev Rawat',
  email: 'sanjeev.rawat@ibvap.gov.in',
  role: 'ADMIN', // ADMIN | COMMANDER | OPERATOR | VIEWER
  department: 'Border Security Command HQ',
  badgeNumber: 'BSF-HQ-001',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  station: 'HQ Northern Command',
  twoFactorEnabled: true,
  lastLogin: new Date().toISOString()
};

const AUTH_STORAGE_KEY = 'ibvap_auth_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_USER;
      }
    }
    return DEFAULT_USER; // Default logged-in state for presentation
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            email: session.user.email,
            role: session.user.user_metadata?.role || 'OPERATOR',
            department: 'Border Defense Unit',
            badgeNumber: 'BDU-2026',
            avatar: session.user.user_metadata?.avatar_url || DEFAULT_USER.avatar,
            station: 'Frontier Post Alpha',
          });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            email: session.user.email,
            role: session.user.user_metadata?.role || 'OPERATOR',
            department: 'Border Defense Unit',
            badgeNumber: 'BDU-2026',
            avatar: session.user.user_metadata?.avatar_url || DEFAULT_USER.avatar,
            station: 'Frontier Post Alpha',
          });
        } else {
          // If session ended in supabase
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const login = async (email, password, selectedRole = 'ADMIN') => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const loggedUser = {
            id: data.user.id,
            name: data.user.user_metadata?.full_name || email.split('@')[0],
            email: data.user.email,
            role: data.user.user_metadata?.role || selectedRole,
            department: 'Border Defense Command',
            badgeNumber: 'TAC-771',
            avatar: DEFAULT_USER.avatar,
            station: 'Northern Sector Base'
          };
          setUser(loggedUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedUser));
          await auditLogsService.log('User Logged In', `Session authenticated via Supabase for ${email}`, loggedUser.name, loggedUser.role);
          return { success: true, user: loggedUser };
        }
      }

      // Mock Authentication flow
      const nameMap = {
        ADMIN: 'Col. Sanjeev Rawat',
        COMMANDER: 'Maj. Rajesh Sharma',
        OPERATOR: 'Insp. Priya Verma',
        VIEWER: 'Officer Amit Deshmukh'
      };

      const deptMap = {
        ADMIN: 'Border Security Command HQ',
        COMMANDER: '8th Mountain Rifles Sector Ops',
        OPERATOR: 'Surveillance Intelligence Wing',
        VIEWER: 'Ministry Security Audit'
      };

      const mockUser = {
        id: `USR-${selectedRole.substring(0, 3)}-01`,
        name: nameMap[selectedRole] || 'Surveillance Officer',
        email: email || `${selectedRole.toLowerCase()}@ibvap.gov.in`,
        role: selectedRole,
        department: deptMap[selectedRole] || 'Border Defense Operations',
        badgeNumber: `TAC-${Math.floor(100 + Math.random() * 900)}`,
        avatar: DEFAULT_USER.avatar,
        station: 'North Frontier Command Base',
        twoFactorEnabled: true,
        lastLogin: new Date().toISOString()
      };

      setUser(mockUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
      await auditLogsService.log('User Logged In', `Tactical session initialized (${selectedRole})`, mockUser.name, mockUser.role);
      return { success: true, user: mockUser };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'Authentication failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user) {
      await auditLogsService.log('User Logged Out', 'Tactical session terminated', user.name, user.role);
    }
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updateProfile = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
