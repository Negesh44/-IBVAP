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
  Lock
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { auditLogsService } from '../services/auditLogsService';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const loadLogs = async () => {
    const list = await auditLogsService.getAll();
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (filterAction !== 'ALL' && !l.action.toLowerCase().includes(filterAction.toLowerCase())) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.id.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.user.toLowerCase().includes(q) ||
        l.resource.toLowerCase().includes(q) ||
        l.ipAddress?.includes(q)
      );
    }
    return true;
  });

  const columns = [
    {
      header: 'Log ID',
      accessor: 'id',
      className: 'font-mono text-cyan-400 font-bold'
    },
    {
      header: 'Action Performed',
      accessor: 'action',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-100">{val}</span>
        </div>
      )
    },
    {
      header: 'Operator / Principal',
      accessor: 'user',
      render: (val, row) => (
        <div className="font-mono text-xs">
          <div className="text-slate-200 font-semibold">{val}</div>
          <div className="text-cyan-400 text-[10px]">{row.userRole || 'OPERATOR'}</div>
        </div>
      )
    },
    {
      header: 'Resource Target / Context',
      accessor: 'resource',
      className: 'text-xs font-mono text-slate-300 max-w-sm truncate'
    },
    {
      header: 'IP & Workstation',
      accessor: 'ipAddress',
      render: (val, row) => (
        <div className="font-mono text-[11px]">
          <div className="text-slate-300">{val}</div>
          <div className="text-slate-500 text-[10px] truncate max-w-xs">{row.device}</div>
        </div>
      )
    },
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      className: 'font-mono text-xs text-slate-400',
      render: (val) => formatDateTime(val)
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => <StatusBadge status={val} />
    }
  ];

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
              SHA-256 Chained Integrity
            </span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight mt-1 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-cyan-400" />
            System Security & Operational Audit Logs
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Cryptographically Verified Access Records, Configuration Mutations & Command Dispatches
          </p>
        </div>

        <button
          onClick={() => alert('Complete Audit Log exported as encrypted CSV report.')}
          className="px-4 py-2 rounded-xl bg-command-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Audit Trail (.csv)
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-command-900/60 border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1 hidden sm:block" />
          {['ALL', 'Login', 'Camera', 'Alert', 'Friendly', 'Evidence'].map(act => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                filterAction === act
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {act === 'ALL' ? 'All Activity' : act}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
      />
    </div>
  );
}
