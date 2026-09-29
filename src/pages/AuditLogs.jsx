import React, { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Search, 
  Filter, 
  ShieldCheck, 
  Laptop, 
  Terminal, 
  Clock, 
  Download, 
  AlertCircle,
  FileCheck2,
  Lock,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Layers,
  Database,
  User,
  Camera,
  ShieldAlert,
  CalendarDays,
  UserCheck,
  Settings
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { auditLogsService } from '../services/auditLogsService';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

const FILTER_CATEGORIES = [
  { id: 'ALL', label: 'All', icon: Layers },
  { id: 'Authentication', label: 'Authentication', keywords: ['login', 'logout', 'auth', 'session'] },
  { id: 'Camera', label: 'Camera', keywords: ['camera', 'rtsp', 'ptz'] },
  { id: 'Alert', label: 'Alert', keywords: ['alert', 'alarm', 'acknowledge', 'resolve', 'siren'] },
  { id: 'Event', label: 'Event', keywords: ['event', 'evidence', 'clip'] },
  { id: 'Friendly Person', label: 'Friendly Person', keywords: ['friendly', 'person', 'biometric', 'face'] },
  { id: 'User', label: 'User', keywords: ['user', 'role', 'clearance', 'profile'] },
  { id: 'System', label: 'System', keywords: ['system', 'setting', 'settings', 'config', 'daemon', 'watchdog'] }
];

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const list = await auditLogsService.getAll();
      setLogs(list);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Log ID', 'Timestamp', 'User ID', 'User Name', 'Role', 'Action', 'Resource Type', 'Resource ID', 'Details', 'IP Address', 'Status'];
    const rows = logs.map(l => [
      l.id,
      `"${l.timestamp || l.createdAt}"`,
      `"${l.userId || ''}"`,
      `"${l.user || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.action || ''}"`,
      `"${l.resourceType || ''}"`,
      `"${l.resourceId || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
      `"${l.status || 'SUCCESS'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IBVAP_AUDIT_TRAIL_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyJSON = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filtering
  const filteredLogs = logs.filter((l) => {
    // Category check
    if (activeCategory !== 'ALL') {
      const catConfig = FILTER_CATEGORIES.find(c => c.id === activeCategory);
      if (catConfig && catConfig.keywords) {
        const textToCheck = `${l.action} ${l.resourceType || ''} ${l.resource || ''} ${l.details || ''}`.toLowerCase();
        const matchesCat = catConfig.keywords.some(k => textToCheck.includes(k.toLowerCase()));
        if (!matchesCat) return false;
      }
    }

    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (l.id || '').toLowerCase().includes(q);
      const matchAction = (l.action || '').toLowerCase().includes(q);
      const matchUser = (l.user || '').toLowerCase().includes(q);
      const matchResource = (l.resource || '').toLowerCase().includes(q);
      const matchResourceType = (l.resourceType || '').toLowerCase().includes(q);
      const matchResourceId = (l.resourceId || '').toLowerCase().includes(q);
      const matchDetails = (l.details || '').toLowerCase().includes(q);
      const matchIp = (l.ipAddress || '').toLowerCase().includes(q);

      if (!matchId && !matchAction && !matchUser && !matchResource && !matchResourceType && !matchResourceId && !matchDetails && !matchIp) {
        return false;
      }
    }

    return true;
  });

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      className: 'font-mono text-xs text-slate-400 whitespace-nowrap',
      render: (val) => (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>{formatDateTime(val)}</span>
        </div>
      )
    },
    {
      header: 'User',
      accessor: 'user',
      render: (val, row) => (
        <div className="font-mono text-xs">
          <div className="text-slate-200 font-semibold">{val}</div>
          <div className="text-cyan-400 text-[10px]">{row.userRole || 'OPERATOR'}</div>
        </div>
      )
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (val, row) => (
        <div 
          onClick={() => setSelectedLog(row)}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">{val}</span>
        </div>
      )
    },
    {
      header: 'Resource',
      accessor: 'resource',
      render: (val, row) => (
        <div className="text-xs font-mono text-slate-300 max-w-xs truncate">
          <span className="text-slate-400">{row.resourceType ? `[${row.resourceType}] ` : ''}</span>
          <span>{row.resourceId || val || 'System'}</span>
        </div>
      )
    },
    {
      header: 'Details',
      accessor: 'details',
      className: 'text-xs font-mono text-slate-400 max-w-md truncate',
      render: (val) => val || '—'
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => <StatusBadge status={val || 'SUCCESS'} />
    },
    {
      header: 'Inspect',
      accessor: 'id',
      render: (id, row) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="p-1.5 rounded-lg bg-command-950 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 hover:text-cyan-300 transition-colors"
          title="View Complete Audit Metadata"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  // Helper to format details nicely
  const renderFormattedDetails = (details) => {
    if (!details) return <p className="text-slate-400 italic">No additional metadata payload.</p>;

    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      if (typeof parsed === 'object' && parsed !== null) {
        return (
          <pre className="p-3.5 rounded-xl bg-command-950 border border-slate-800 text-cyan-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      }
    } catch {
      // not json, display as structured text
    }

    return (
      <div className="p-3.5 rounded-xl bg-command-950 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed">
        {details}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              TAMPER-PROOF AUDIT JOURNAL
            </span>
            <span className="text-xs font-mono text-slate-400">
              Supabase `audit_logs`
            </span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight mt-1 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-cyan-400" />
            Operational & Security Audit Logs
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Immutable tracking of logins, camera configurations, alert dispatches, role mutations & evidence inspection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-xl bg-command-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-command-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Export Audit Trail (.csv)
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Ribbon */}
      <div className="flex flex-col space-y-3 p-3.5 rounded-xl bg-command-900/60 border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs font-mono pb-1 sm:pb-0">
          <span className="text-slate-500 text-[11px] uppercase mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {FILTER_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-glow-cyan'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="text-xs font-mono text-slate-400">
            Showing <span className="text-cyan-300 font-bold">{filteredLogs.length}</span> recorded journal entries
          </div>

          <div className="relative sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action, user, resource, details..."
              className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
      />

      {/* Audit Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Verification Entry"
          subtitle={`Log ID: ${selectedLog.id}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Action Banner */}
            <div className="p-4 rounded-xl bg-command-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{selectedLog.action}</h3>
                  <p className="text-xs font-mono text-slate-400">
                    Target: <span className="text-cyan-300">{selectedLog.resourceType || 'Resource'}</span> / {selectedLog.resourceId || 'N/A'}
                  </p>
                </div>
              </div>

              <StatusBadge status={selectedLog.status || 'SUCCESS'} />
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Timestamp</span>
                <span className="text-slate-200 font-semibold mt-0.5 block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatDateTime(selectedLog.timestamp || selectedLog.createdAt)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Operator / User</span>
                <span className="text-slate-200 font-semibold mt-0.5 block flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  {selectedLog.user} ({selectedLog.userRole || 'ADMIN'})
                </span>
              </div>

              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Resource Type</span>
                <span className="text-slate-200 font-semibold mt-0.5 block">{selectedLog.resourceType || 'System'}</span>
              </div>

              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Resource ID</span>
                <span className="text-cyan-400 font-bold mt-0.5 block">{selectedLog.resourceId || 'None'}</span>
              </div>

              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Origin IP Address</span>
                <span className="text-slate-300 mt-0.5 block">{selectedLog.ipAddress || '10.240.12.88'}</span>
              </div>

              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">User ID</span>
                <span className="text-slate-300 mt-0.5 block">{selectedLog.userId || 'USR-001'}</span>
              </div>
            </div>

            {/* Formatted Details Payload */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                <span className="text-slate-300 font-bold uppercase tracking-wider">Recorded Details & Payload:</span>
                <button
                  onClick={() => handleCopyJSON(selectedLog.details || '')}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedId ? 'Copied' : 'Copy Details'}
                </button>
              </div>

              {renderFormattedDetails(selectedLog.details)}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
              >
                Close Audit Entry
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
