import React, { useState } from 'react';
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
  Zap
} from 'lucide-react';
import AlertCard from '../components/alerts/AlertCard';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { useSurveillance } from '../contexts/SurveillanceContext';
import { formatRelativeTime, formatDateTime } from '../utils/formatters';

export default function Alerts() {
  const { alerts, acknowledgeAlert, resolveAlert, triggerSimulatedAlert } = useSurveillance();
  const [filterSeverity, setFilterSeverity] = useState('ALL'); // ALL, CRITICAL, WARNING, RESOLVED
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Filter alerts
  const filteredAlerts = alerts.filter(a => {
    // Severity/Status filter
    if (filterSeverity === 'CRITICAL' && a.severity !== 'CRITICAL') return false;
    if (filterSeverity === 'WARNING' && a.severity !== 'WARNING') return false;
    if (filterSeverity === 'RESOLVED' && a.status !== 'RESOLVED') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.id.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.camera.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
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
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          <span>{val}</span>
        </div>
      )
    },
    {
      header: 'Type & Description',
      accessor: 'type',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-100">{val}</div>
          <div className="text-[11px] text-slate-400 truncate max-w-xs font-mono">{row.description}</div>
        </div>
      )
    },
    {
      header: 'Camera / Sector',
      accessor: 'camera',
      render: (val, row) => (
        <div className="font-mono text-xs">
          <div className="text-slate-200">{val}</div>
          <div className="text-slate-500 text-[10px]">{row.location}</div>
        </div>
      )
    },
    {
      header: 'Severity',
      accessor: 'severity',
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: 'Time',
      accessor: 'timestamp',
      className: 'font-mono text-xs text-slate-400',
      render: (val, row) => formatRelativeTime(val || row.time)
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => <StatusBadge status={val} pulse={val === 'ACTIVE'} />
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAlert(row);
            }}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 font-mono text-xs transition-colors flex items-center gap-1 border border-slate-700/60"
          >
            <Eye className="w-3.5 h-3.5" />
            Inspect
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Security Alert Management Center
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Automated Intrusion Threat Triage, Spatial Tripwires & Response Coordination
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerSimulatedAlert()}
            className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-glow-red"
          >
            <Zap className="w-3.5 h-3.5 text-red-400 animate-bounce" />
            Trigger Test Alert
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-command-900/60 border border-slate-800">
        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1 hidden sm:block" />
          {[
            { label: 'All Alerts', val: 'ALL', count: alerts.length },
            { label: 'Critical', val: 'CRITICAL', count: alerts.filter(a => a.severity === 'CRITICAL').length },
            { label: 'Warning', val: 'WARNING', count: alerts.filter(a => a.severity === 'WARNING').length },
            { label: 'Resolved', val: 'RESOLVED', count: alerts.filter(a => a.status === 'RESOLVED').length },
          ].map(f => (
            <button
              key={f.val}
              onClick={() => setFilterSeverity(f.val)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterSeverity === f.val
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{f.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 border border-slate-700">
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Layout toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter alerts by keyword..."
              className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-1 bg-command-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Alert Listings */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.length === 0 ? (
            <div className="col-span-2 p-12 text-center text-slate-500 font-mono text-xs rounded-xl border border-dashed border-slate-800">
              No security alerts matching this filter criteria.
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onClick={() => setSelectedAlert(alert)}
                onAcknowledge={acknowledgeAlert}
                onResolve={resolveAlert}
              />
            ))
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredAlerts}
          onRowClick={(row) => setSelectedAlert(row)}
        />
      )}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onUpdateStatus={resolveAlert}
        />
      )}
    </div>
  );
}
