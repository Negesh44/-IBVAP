import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  ShieldAlert, 
  Camera, 
  UserCheck, 
  CalendarDays, 
  BarChart3, 
  Users, 
  ScrollText, 
  Settings, 
  LogOut, 
  Shield, 
  Radio, 
  Flame,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSurveillance } from '../../contexts/SurveillanceContext';
import { cn } from '../../utils/cn';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { unreadAlertsCount, triggerSimulatedAlert } = useSurveillance();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userRole = (user?.role || 'OPERATOR').toUpperCase();

  const allNavItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: LayoutDashboard,
      allowedRoles: ['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']
    },
    { 
      name: 'Live Surveillance', 
      path: '/live', 
      icon: Video, 
      pulseBadge: true,
      allowedRoles: ['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']
    },
    { 
      name: 'Alerts', 
      path: '/alerts', 
      icon: ShieldAlert, 
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : null,
      allowedRoles: ['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']
    },
    { 
      name: 'Cameras', 
      path: '/cameras', 
      icon: Camera,
      allowedRoles: ['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']
    },
    { 
      name: 'Friendly Persons', 
      path: '/friendly-persons', 
      icon: UserCheck,
      allowedRoles: ['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']
    },
    { 
      name: 'Events', 
      path: '/events', 
      icon: CalendarDays,
      allowedRoles: ['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']
    },
    { 
      name: 'Analytics', 
      path: '/analytics', 
      icon: BarChart3,
      allowedRoles: ['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']
    },
    { 
      name: 'Users', 
      path: '/users', 
      icon: Users,
      allowedRoles: ['ADMIN']
    },
    { 
      name: 'Audit Logs', 
      path: '/audit-logs', 
      icon: ScrollText,
      allowedRoles: ['ADMIN', 'COMMANDER']
    },
    { 
      name: 'Settings', 
      path: '/settings', 
      icon: Settings,
      allowedRoles: ['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']
    },
  ];

  const visibleNavItems = allNavItems.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-64 bg-command-950/95 border-r border-slate-800/80 backdrop-blur-xl flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          {/* Logo & Platform Brand */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 p-[1px] shadow-glow-cyan">
                <div className="w-full h-full bg-command-950 rounded-[11px] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-command-950 animate-pulse" />
              </div>
              <div>
                <h1 className="font-extrabold text-slate-100 tracking-wider font-mono text-base flex items-center gap-1.5">
                  IBVAP
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-normal">
                    v1.0
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-tight leading-tight">
                  Intelligent Border Analytics
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            <div className="px-3 py-1 text-[10px] font-mono font-semibold uppercase text-slate-500 tracking-wider flex items-center justify-between">
              <span>Tactical Console</span>
              <span className="text-[9px] text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/20">
                {userRole}
              </span>
            </div>

            {visibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono font-medium transition-all group",
                    isActive
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_-3px_rgba(0,229,255,0.25)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500 text-white animate-pulse">
                        {item.badge}
                      </span>
                    )}

                    {item.pulseBadge && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Bottom Section: SIH Demo Alert Trigger & User / Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-command-950/60 space-y-3">
          {/* Quick SIH Simulation Trigger Button */}
          <button
            onClick={() => triggerSimulatedAlert()}
            className="w-full py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-glow-red"
            title="Simulate Real-time Neural Alarm for Demo"
          >
            <Zap className="w-3.5 h-3.5 text-red-400 animate-bounce" />
            <span>Simulate AI Alarm</span>
          </button>

          {/* User Profile Mini Bar & Logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt="Avatar"
                className="w-8 h-8 rounded-lg object-cover border border-slate-700"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user?.name || user?.fullName || 'Officer'}
                </p>
                <p className="text-[10px] font-mono text-cyan-400 truncate">
                  {userRole}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
