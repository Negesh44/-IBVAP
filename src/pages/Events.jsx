import React, { useState } from 'react';
import { 
  CalendarDays, 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  MapPin, 
  Video, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  Car, 
  UserCheck, 
  UserX,
  Share2,
  Download
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { useSurveillance } from '../contexts/SurveillanceContext';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

export default function Events() {
  const { events } = useSurveillance();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const safeEvents = Array.isArray(events) ? events : [];

  const filteredEvents = safeEvents.filter(e => {
    if (!e) return false;
    if (filterType !== 'ALL' && !e.eventType.toLowerCase().includes(filterType.toLowerCase())) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.id.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q) ||
        e.camera.toLowerCase().includes(q) ||
        e.targetId.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns = [
    {
      header: 'Event ID',
      accessor: 'id',
      className: 'font-mono text-cyan-400 font-bold'
    },
    {
      header: 'Event Classification',
      accessor: 'eventType',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          {row.severity === 'CRITICAL' ? (
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          ) : row.targetType === 'FRIENDLY' ? (
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : row.targetType === 'VEHICLE' ? (
            <Car className="w-4 h-4 text-cyan-400 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="font-semibold text-slate-100">{val}</span>
        </div>
      )
    },
    {
      header: 'Camera / Post',
      accessor: 'camera',
      className: 'text-xs font-mono text-slate-300'
    },
    {
      header: 'Person / Vehicle ID',
      accessor: 'targetId',
      className: 'font-mono text-xs text-cyan-300 font-bold',
      render: (val) => val || 'N/A'
    },
    {
      header: 'Severity',
      accessor: 'severity',
      render: (val) => <StatusBadge status={val} />
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
    },
    {
      header: 'Evidence',
      accessor: 'id',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEvent(row);
          }}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 font-mono text-xs transition-colors flex items-center gap-1 border border-slate-700/60"
        >
          <Eye className="w-3.5 h-3.5" />
          Details
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-400" />
            Border Event & Incident Log Archive
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Immutable Chronological Event Log, AI Verification Traces & Forensics Evidence
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-command-950 px-3 py-2 rounded-xl border border-slate-800">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Real-Time Stream Active</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-command-900/60 border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1 hidden sm:block" />
          {[
            { label: 'All Events', val: 'ALL' },
            { label: 'Breaches', val: 'Breach' },
            { label: 'Friendly', val: 'Friendly' },
            { label: 'Vehicles', val: 'Vehicle' },
            { label: 'Movement', val: 'Movement' },
          ].map(f => (
            <button
              key={f.val}
              onClick={() => setFilterType(f.val)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                filterType === f.val
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event ID, camera, subject..."
            className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Event Table */}
      <DataTable
        columns={columns}
        data={filteredEvents}
        onRowClick={(row) => setSelectedEvent(row)}
      />

      {/* Event Detail & Evidence Modal */}
      {selectedEvent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title={`Forensic Incident Record — ${selectedEvent.id}`}
          subtitle={`${selectedEvent.eventType} • ${selectedEvent.camera}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            {/* Simulated Evidence Graphic */}
            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-[#091321] to-[#040810]">
                <svg className="w-full h-full opacity-35" preserveAspectRatio="none" viewBox="0 0 400 200">
                  <polygon points="0,120 70,80 160,110 240,60 320,100 400,70 400,200 0,200" fill="#1e293b" />
                  <line x1="0" y1="140" x2="400" y2="140" stroke="#00e5ff" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
              </div>

              {/* Target Bounding Frame */}
              <div className="absolute inset-x-[40%] inset-y-[28%] border-2 border-amber-400 bg-amber-500/20 flex flex-col justify-between p-1">
                <span className="text-[10px] font-mono bg-amber-950/90 text-amber-300 px-1 rounded border border-amber-400">
                  {selectedEvent.targetId}
                </span>
                <span className="text-[8px] font-mono text-white bg-black/80 px-1 rounded self-end">
                  CONF: {selectedEvent.confidence || '94%'}
                </span>
              </div>

              {/* Top Watermark */}
              <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-black/70 px-2 py-0.5 rounded">
                AUTHENTICATED FORENSIC ARTIFACT #{selectedEvent.id}
              </div>
              <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-300 bg-black/70 px-2 py-0.5 rounded">
                {formatDateTime(selectedEvent.timestamp)}
              </div>
            </div>

            {/* Event Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CAMERA NODE</span>
                <span className="text-slate-200 font-semibold">{selectedEvent.camera}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SECTOR LOCATION</span>
                <span className="text-slate-200 font-semibold">{selectedEvent.location || 'North Sector'}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SEVERITY / STATUS</span>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={selectedEvent.severity} />
                  <StatusBadge status={selectedEvent.status} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">EVIDENCE FORMAT</span>
                <span className="text-cyan-300">{selectedEvent.evidenceType || 'Encrypted Video Chunk'}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">RECORDING OPERATOR</span>
                <span className="text-slate-200">{selectedEvent.operator || 'System AI'}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">COORDINATES</span>
                <span className="text-slate-400">{selectedEvent.coordinates || '34.0837° N, 74.7973° E'}</span>
              </div>
            </div>

            {/* Action protocol taken */}
            <div className="p-3.5 rounded-xl bg-command-950 border border-slate-800">
              <span className="text-xs font-mono text-slate-500 block mb-1">Response Action Taken:</span>
              <p className="text-xs font-mono text-emerald-400">
                {selectedEvent.actionTaken || 'Incident recorded and indexed into secure database.'}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => alert(`Forensic bundle for ${selectedEvent.id} exported successfully.`)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Evidence Package (.tar.gz)
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
