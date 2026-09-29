import React, { createContext, useContext, useState, useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { profilesService, auditLogsService } from '../services/profilesService';

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
    return DEFAULT_USER;
  });

  const [loading, setLoading] = useState(false);

  // Restore profile from Supabase on mount
  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const profile = await profilesService.getProfileById(session.user.id);
          const fullUser = profile || {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            email: session.user.email,
            role: session.user.user_metadata?.role || 'ADMIN',
            department: 'Border Defense Command',
            badgeNumber: 'TAC-001',
            avatar: session.user.user_metadata?.avatar_url || DEFAULT_USER.avatar,
            station: 'Frontier Post Alpha',
          };
          setUser(fullUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fullUser));
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await profilesService.getProfileById(session.user.id);
          const fullUser = profile || {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            email: session.user.email,
            role: session.user.user_metadata?.role || 'ADMIN',
            department: 'Border Defense Command',
            badgeNumber: 'TAC-001',
            avatar: session.user.user_metadata?.avatar_url || DEFAULT_USER.avatar,
            station: 'Frontier Post Alpha',
          };
          setUser(fullUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fullUser));
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
        
        if (!error && data?.user) {
          let profile = await profilesService.getProfileById(data.user.id);
          if (!profile) {
            profile = await profilesService.create({
              id: data.user.id,
              name: data.user.user_metadata?.full_name || email.split('@')[0],
              email: data.user.email,
              role: data.user.user_metadata?.role || selectedRole,
              department: 'Border Defense Command'
            });
          }
          const loggedUser = profile || {
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

      // Mock Role Auth fallback for instant presentation
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

  const signUp = async (email, password, fullName, selectedRole = 'OPERATOR') => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: selectedRole,
            }
          }
        });

        if (error) throw error;

        if (data?.user) {
          const profile = await profilesService.create({
            id: data.user.id,
            name: fullName,
            email: email,
            role: selectedRole,
            department: 'Border Defense Unit'
          });
          if (data.session) {
            setUser(profile);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
            return { success: true, user: profile };
          }
          return { success: true, message: 'Account created! Please check your email or sign in.' };
        }
      }

      // Local mock fallback
      const mockUser = {
        id: `USR-${Date.now().toString().slice(-4)}`,
        name: fullName,
        email: email,
        role: selectedRole,
        department: 'Border Defense Unit',
        badgeNumber: 'TAC-001',
        avatar: DEFAULT_USER.avatar,
        station: 'Frontier Post',
        twoFactorEnabled: false
      };
      setUser(mockUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    } catch (err) {
      console.error('Sign up error:', err);
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user) {
      await auditLogsService.log('User Logged Out', 'Tactical session terminated', user.name, user.role);
    }
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updateProfile = async (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    if (isSupabaseConfigured && user?.id) {
      await profilesService.create({ id: user.id, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        signUp,
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
