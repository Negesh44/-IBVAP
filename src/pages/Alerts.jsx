import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Search, 
  LayoutGrid, 
  List, 
  Calendar,
  Clock,
  Eye,
  MapPin,
  Video,
  Zap,
  Info,
  Radio,
  FileCheck,
  UserX,
  Car,
  Layers
} from 'lucide-react';
import AlertCard from '../components/alerts/AlertCard';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import DataTable from '../components/common/DataTable';
import EmptyState from '../components/common/EmptyState';
import { useSurveillance } from '../contexts/SurveillanceContext';
import { useAuth } from '../contexts/AuthContext';
import { formatRelativeTime, formatDateTime } from '../utils/formatters';
import { cn } from '../utils/cn';

export default function Alerts() {
  const { user } = useAuth();
  const { alerts, acknowledgeAlert, resolveAlert, triggerSimulatedAlert } = useSurveillance();
  const [filterSeverity, setFilterSeverity] = useState('ALL'); // ALL | CRITICAL | WARNING | INFO | ACTIVE | ACKNOWLEDGED | RESOLVED
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [selectedAlert, setSelectedAlert] = useState(null);

  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  // Filter alerts based on category & search
  const filteredAlerts = safeAlerts.filter(a => {
    if (!a) return false;

    // Severity / Status filter
    if (filterSeverity === 'CRITICAL' && a.severity !== 'CRITICAL') return false;
    if (filterSeverity === 'WARNING' && a.severity !== 'WARNING') return false;
    if (filterSeverity === 'INFO' && a.severity !== 'INFO') return false;
    if (filterSeverity === 'ACTIVE' && a.status !== 'ACTIVE') return false;
    if (filterSeverity === 'ACKNOWLEDGED' && a.status !== 'ACKNOWLEDGED' && a.status !== 'IN_REVIEW') return false;
    if (filterSeverity === 'RESOLVED' && a.status !== 'RESOLVED') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const alertId = (a.id || '').toLowerCase();
      const alertType = (a.type || a.alertType || '').toLowerCase();
      const camera = (a.camera || a.cameraId || '').toLowerCase();
      const location = (a.location || '').toLowerCase();
      const desc = (a.description || '').toLowerCase();
      return (
        alertId.includes(q) ||
        alertType.includes(q) ||
        camera.includes(q) ||
        location.includes(q) ||
        desc.includes(q)
      );
    }
    return true;
  });

  // Table Columns
  const columns = [
    {
      header: 'Alert ID',
      accessor: 'id',
      className: 'font-mono text-cyan-400 font-bold',
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          {row.severity === 'CRITICAL' && row.status === 'ACTIVE' && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
          <span>{row.id}</span>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (val, row) => {
        const typeStr = row.type || row.alertType || 'Alert';
        const isUnknown = typeStr.toLowerCase().includes('unknown');
        const isFence = typeStr.toLowerCase().includes('fence') || typeStr.toLowerCase().includes('tripwire');
        const isVehicle = typeStr.toLowerCase().includes('vehicle');

        return (
          <div className="flex items-center gap-2">
            {row.severity === 'CRITICAL' ? (
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            ) : row.severity === 'WARNING' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <div>
              <span className="font-semibold text-slate-100 block">{typeStr}</span>
              {isUnknown && (
                <span className="text-[10px] text-amber-400 font-mono">Unrecognized individual</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Severity',
      accessor: 'severity',
      render: (val, row) => {
        const sev = (row.severity || 'WARNING').toUpperCase();
        // Severity color: INFO -> blue, WARNING -> yellow, CRITICAL -> red
        let colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/40';
        if (sev === 'CRITICAL') colorClass = 'bg-red-500/20 text-red-400 border-red-500/40';
        else if (sev === 'WARNING') colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';

        return (
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider", colorClass)}>
            {sev}
          </span>
        );
      }
    },
    {
      header: 'Camera',
      accessor: 'camera',
      className: 'font-mono text-slate-300 font-semibold',
      render: (val, row) => (
        <span className="text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 text-xs font-mono">
          {row.camera || row.cameraId || 'BOP-001'}
        </span>
      )
    },
    {
      header: 'Location',
      accessor: 'location',
      render: (val, row) => (
        <span className="text-xs text-slate-300 flex items-center gap-1 font-mono">
          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
          {row.location}
        </span>
      )
    },
    {
      header: 'Time',
      accessor: 'detectedAt',
      className: 'font-mono text-slate-400 text-xs',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-slate-200">{formatRelativeTime(row.detectedAt || row.createdAt || row.timestamp)}</span>
          <span className="text-[10px] text-slate-500">{formatDateTime(row.detectedAt || row.createdAt || row.timestamp)}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val, row) => {
        const st = (row.status || 'ACTIVE').toUpperCase();
        // Status color: ACTIVE -> red, ACKNOWLEDGED -> yellow, RESOLVED -> green
        let colorClass = 'bg-red-500/20 text-red-400 border-red-500/40';
        if (st === 'RESOLVED') colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
        else if (st === 'ACKNOWLEDGED' || st === 'IN_REVIEW') colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';

        return (
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider", colorClass)}>
            {st}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedAlert(row)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 text-xs font-mono transition-colors flex items-center gap-1 border border-slate-700/60"
          >
            <Eye className="w-3 h-3" />
            Inspect
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Simulation Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30">
              SUPABASE REALTIME ACTIVE
            </span>
            <span className="text-xs font-mono text-slate-400">
              Perimeter Security Alarm Management
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight mt-1">
            Tactical Security Alerts Center
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time automated incident queue with triage, forensic evidence inspection, and unit dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => triggerSimulatedAlert('Virtual Fence Breach')}
            className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-glow-red"
          >
            <Zap className="w-3.5 h-3.5 text-red-400 animate-bounce" />
            Trigger Fence Breach
          </button>
          <button
            onClick={() => triggerSimulatedAlert('Unknown Person')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
          >
            <UserX className="w-3.5 h-3.5 text-amber-400" />
            Trigger Unknown Person
          </button>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Alert ID, Camera, Alert Type, Location..."
            className="w-full bg-command-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Filter Chips & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All Alerts' },
              { id: 'CRITICAL', label: 'Critical' },
              { id: 'WARNING', label: 'Warning' },
              { id: 'INFO', label: 'Info' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'ACKNOWLEDGED', label: 'Acknowledged' },
              { id: 'RESOLVED', label: 'Resolved' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterSeverity(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap",
                  filterSeverity === f.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                viewMode === 'table' ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300"
              )}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                viewMode === 'cards' ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300"
              )}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No Security Alerts Found"
          description={searchQuery ? "No alerts match the search criteria." : "No active or historical alerts recorded for the selected filter."}
          actionLabel="Simulate Fence Alarm"
          onAction={() => triggerSimulatedAlert('Virtual Fence Breach')}
        />
      ) : viewMode === 'table' ? (
        <div className="rounded-2xl overflow-hidden border border-slate-800 bg-command-900/70 backdrop-blur-xl">
          <DataTable
            columns={columns}
            data={filteredAlerts}
            onRowClick={(row) => setSelectedAlert(row)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onClick={() => setSelectedAlert(alert)}
              onAcknowledge={(a) => acknowledgeAlert(a.id, 'Acknowledged by operator', user?.name, user?.role, user?.id)}
              onResolve={(a) => resolveAlert(a.id, 'Threat cleared by operator', user?.name, user?.role, user?.id)}
            />
          ))}
        </div>
      )}

      {/* Alert Detail Inspection Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onUpdateStatus={async (alertId, status, note, userName, userRole, userId) => {
            if (status === 'RESOLVED') {
              await resolveAlert(alertId, note, userName, userRole, userId);
            } else {
              await acknowledgeAlert(alertId, note, userName, userRole, userId);
            }
          }}
        />
      )}
    </div>
  );
}
