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
  User,
  Share2, 
  Download,
  Activity,
  Layers,
  Sparkles,
  Calendar
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import EmptyState from '../components/common/EmptyState';
import EventDetailModal from '../components/events/EventDetailModal';
import EventTimeline from '../components/events/EventTimeline';
import { useSurveillance } from '../contexts/SurveillanceContext';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';
import { cn } from '../utils/cn';

export default function Events() {
  const { events } = useSurveillance();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL | PEOPLE | VEHICLES | FRIENDLY | UNKNOWN | ANPR | INTRUSION | LOITERING | NIGHT
  const [dateRange, setDateRange] = useState('TODAY'); // TODAY | 7DAYS | 30DAYS
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showTimeline, setShowTimeline] = useState(true);

  const safeEvents = Array.isArray(events) ? events : [];

  // Filter events by type, date range, and search
  const filteredEvents = safeEvents.filter(e => {
    if (!e) return false;

    // Type filter
    const evType = (e.eventType || '').toLowerCase();
    const objType = (e.objectType || '').toLowerCase();

    if (filterType === 'PEOPLE' && !evType.includes('person') && !objType.includes('person')) return false;
    if (filterType === 'VEHICLES' && !evType.includes('vehicle') && !objType.includes('vehicle') && !evType.includes('anpr')) return false;
    if (filterType === 'FRIENDLY' && !evType.includes('friendly') && !e.personId) return false;
    if (filterType === 'UNKNOWN' && !evType.includes('unknown')) return false;
    if (filterType === 'ANPR' && !evType.includes('anpr')) return false;
    if (filterType === 'INTRUSION' && !evType.includes('fence') && !evType.includes('zone') && !evType.includes('breach')) return false;
    if (filterType === 'LOITERING' && !evType.includes('loitering')) return false;
    if (filterType === 'NIGHT' && !evType.includes('night')) return false;

    // Date range filter
    const eventTime = new Date(e.detectedAt || e.createdAt).getTime();
    const now = Date.now();
    if (dateRange === 'TODAY' && (now - eventTime) > 24 * 60 * 60 * 1000) return false;
    if (dateRange === '7DAYS' && (now - eventTime) > 7 * 24 * 60 * 60 * 1000) return false;
    if (dateRange === '30DAYS' && (now - eventTime) > 30 * 24 * 60 * 60 * 1000) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const id = (e.id || '').toLowerCase();
      const camera = (e.camera || e.cameraId || '').toLowerCase();
      const loc = (e.location || '').toLowerCase();
      const targetId = (e.objectId || e.targetId || '').toLowerCase();
      return (
        id.includes(q) ||
        evType.includes(q) ||
        camera.includes(q) ||
        loc.includes(q) ||
        targetId.includes(q)
      );
    }
    return true;
  });

  // Table Columns
  const columns = [
    {
      header: 'Event ID',
      accessor: 'id',
      className: 'font-mono text-cyan-400 font-bold'
    },
    {
      header: 'Event Type',
      accessor: 'eventType',
      render: (val, row) => {
        const typeStr = row.eventType || 'Perimeter Event';
        const isFriendly = typeStr.toLowerCase().includes('friendly') || !!row.personId;
        const isVehicle = typeStr.toLowerCase().includes('vehicle') || row.objectType === 'VEHICLE';
        const isCritical = row.severity === 'CRITICAL' || typeStr.toLowerCase().includes('fence') || typeStr.toLowerCase().includes('zone');
        const isUnknown = typeStr.toLowerCase().includes('unknown');

        return (
          <div className="flex items-center gap-2">
            {isCritical ? (
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            ) : isFriendly ? (
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : isVehicle ? (
              <Car className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : isUnknown ? (
              <UserX className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <User className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <div>
              <span className="font-semibold text-slate-100 block">{typeStr}</span>
              {isFriendly && (
                <span className="text-[10px] text-emerald-400 font-mono">Verified Friendly</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Camera',
      accessor: 'camera',
      className: 'font-mono text-slate-300',
      render: (val, row) => (
        <span className="text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 text-xs font-mono">
          {row.camera || row.cameraId || 'BOP-001'}
        </span>
      )
    },
    {
      header: 'Object',
      accessor: 'objectType',
      render: (val, row) => (
        <div className="flex flex-col font-mono text-xs">
          <span className="text-slate-200 font-bold">{row.objectType || 'PERSON'}</span>
          <span className="text-[10px] text-slate-400">{row.objectId || row.targetId || 'ID: 104'}</span>
        </div>
      )
    },
    {
      header: 'Confidence',
      accessor: 'confidence',
      className: 'font-mono',
      render: (val, row) => (
        <span className="text-emerald-400 font-bold text-xs bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
          {row.confidence}
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
      header: 'Timestamp',
      accessor: 'detectedAt',
      className: 'font-mono text-slate-400 text-xs',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-slate-200">{formatRelativeTime(row.detectedAt || row.createdAt)}</span>
          <span className="text-[10px] text-slate-500">{formatDateTime(row.detectedAt || row.createdAt)}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (val, row) => (
        <button
          onClick={() => setSelectedEvent(row)}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 text-xs font-mono transition-colors flex items-center gap-1 border border-slate-700/60"
        >
          <Eye className="w-3 h-3" />
          Dossier
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              SUPABASE REALTIME EVENT LOGS
            </span>
            <span className="text-xs font-mono text-slate-400">
              Chronological Tactical Analytics Stream
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight mt-1">
            Border Surveillance Events History
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Neural detection records, cross-border vehicle tracks, biometric facial passes, and virtual tripwires.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <Calendar className="w-3.5 h-3.5 text-cyan-400 ml-2" />
          {[
            { id: 'TODAY', label: 'Today' },
            { id: '7DAYS', label: '7 Days' },
            { id: '30DAYS', label: '30 Days' }
          ].map(d => (
            <button
              key={d.id}
              onClick={() => setDateRange(d.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors font-semibold",
                dateRange === d.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Event ID, Type, Camera, Target ID..."
            className="w-full bg-command-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Event Type Filters */}
        <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PEOPLE', label: 'People' },
            { id: 'VEHICLES', label: 'Vehicles' },
            { id: 'FRIENDLY', label: 'Friendly' },
            { id: 'UNKNOWN', label: 'Unknown' },
            { id: 'ANPR', label: 'ANPR' },
            { id: 'INTRUSION', label: 'Intrusion' },
            { id: 'LOITERING', label: 'Loitering' },
            { id: 'NIGHT', label: 'Night Movement' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap",
                filterType === f.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Events Table + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Events Data Table (8 cols) */}
        <div className="lg:col-span-8">
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Border Events Recorded"
              description={searchQuery ? "No events match the search criteria." : "No chronological events match the current filter selection."}
            />
          ) : (
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-command-900/70 backdrop-blur-xl">
              <DataTable
                columns={columns}
                data={filteredEvents}
                onRowClick={(row) => setSelectedEvent(row)}
              />
            </div>
          )}
        </div>

        {/* Right: Visual Event Timeline (4 cols) */}
        <div className="lg:col-span-4 sticky top-20">
          <EventTimeline
            events={safeEvents}
            onSelectEvent={(evt) => setSelectedEvent(evt)}
          />
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
