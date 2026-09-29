import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Plus, 
  Search, 
  Filter, 
  Sliders, 
  Eye, 
  Edit3, 
  Power, 
  Trash2, 
  Radio, 
  Wifi, 
  KeyRound, 
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  LayoutGrid,
  List,
  RefreshCw,
  X,
  Loader2,
  Lock,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Server
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import SurveillanceFeed from '../components/surveillance/SurveillanceFeed';
import { camerasService, maskRtspUrl } from '../services/camerasService';
import { auditLogsService } from '../services/auditLogsService';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | ONLINE | WARNING | OFFLINE
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals & Active Objects
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'edit' | 'details' | 'live' | 'delete'
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Notifications
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    cameraCode: '',
    name: '',
    location: '',
    rtspUrl: 'rtsp://192.168.10.101:554/live/stream1',
    status: 'ONLINE',
    resolution: '1920x1080 (1080p)',
    fps: 30
  });

  const loadCameras = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await camerasService.getAll();
      if (error) {
        setErrorMessage(`Note: Supabase table sync: ${error}. Displaying active fleet.`);
      }
      setCameras(data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch camera fleet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();

    // Supabase Realtime listener
    const unsubscribe = camerasService.subscribeToChanges(() => {
      loadCameras();
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    const nextNum = cameras.length + 1;
    const code = `BOP-${nextNum < 10 ? '00' + nextNum : '0' + nextNum}`;
    setFormData({
      cameraCode: code,
      name: `Border Post Watch ${code}`,
      location: 'North Sector',
      rtspUrl: `rtsp://192.168.10.1${nextNum}:554/live/stream1`,
      status: 'ONLINE',
      resolution: '1920x1080 (1080p)',
      fps: 30
    });
    setActiveModal('add');
  };

  const handleOpenEdit = (cam, e) => {
    e?.stopPropagation();
    setSelectedCamera(cam);
    setFormData({
      cameraCode: cam.cameraCode,
      name: cam.name,
      location: cam.location,
      rtspUrl: cam.rtspUrl,
      status: cam.status || 'ONLINE',
      resolution: cam.resolution,
      fps: cam.fps
    });
    setActiveModal('edit');
  };

  const handleOpenDetails = (cam, e) => {
    e?.stopPropagation();
    setSelectedCamera(cam);
    setActiveModal('details');
  };

  const handleOpenLive = (cam, e) => {
    e?.stopPropagation();
    setSelectedCamera(cam);
    setActiveModal('live');
  };

  const handleOpenDelete = (cam, e) => {
    e?.stopPropagation();
    setSelectedCamera(cam);
    setActiveModal('delete');
  };

  const handleToggleStatus = async (cam, e) => {
    e?.stopPropagation();
    const nextStatus = cam.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      await camerasService.toggleStatus(cam.id);
      await auditLogsService.log(
        'Camera Status Changed',
        `${cam.name} (${cam.cameraCode}) toggled to ${nextStatus}`,
        'Commander Rawat',
        'ADMIN'
      );
      setSuccessMessage(`${cam.name} status updated to ${nextStatus}.`);
      await loadCameras();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update camera status.');
    } finally {
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (activeModal === 'add') {
        const { data, error } = await camerasService.create(formData);
        if (error) throw new Error(error);
        await auditLogsService.log(
          'Camera Registered',
          `Added ${formData.name} (${formData.cameraCode}) to cameras registry`,
          'Commander Rawat',
          'ADMIN'
        );
        setSuccessMessage(`Camera ${formData.name} successfully registered!`);
      } else if (activeModal === 'edit' && selectedCamera) {
        const { data, error } = await camerasService.update(selectedCamera.id, formData);
        if (error) throw new Error(error);
        await auditLogsService.log(
          'Camera Modified',
          `Updated configuration for ${formData.name}`,
          'Commander Rawat',
          'ADMIN'
        );
        setSuccessMessage(`Updated configuration for ${formData.name}.`);
      }

      setActiveModal(null);
      await loadCameras();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save camera.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCamera) return;
    setSubmitting(true);
    try {
      await camerasService.delete(selectedCamera.id);
      await auditLogsService.log(
        'Camera Deleted',
        `Removed ${selectedCamera.name} (${selectedCamera.cameraCode}) from cameras`,
        'Commander Rawat',
        'ADMIN'
      );
      setSuccessMessage(`Camera ${selectedCamera.name} removed.`);
      setActiveModal(null);
      await loadCameras();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete camera.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  // Filter & Search Logic
  const filteredCameras = cameras.filter(c => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.cameraCode?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns = [
    {
      header: 'Camera Code',
      accessor: 'cameraCode',
      className: 'font-mono text-cyan-400 font-bold',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            row.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' :
            row.status === 'WARNING' ? 'bg-amber-400' : 'bg-red-500'
          }`} />
          <span>{val}</span>
        </div>
      )
    },
    {
      header: 'Camera Name',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-100">{val}</div>
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-600" />
            <span>{maskRtspUrl(row.rtspUrl)}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Location',
      accessor: 'location',
      className: 'text-xs text-slate-300 font-mono'
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => <StatusBadge status={val} pulse={val === 'ONLINE'} />
    },
    {
      header: 'Resolution',
      accessor: 'resolution',
      className: 'text-xs font-mono text-slate-300',
      render: (val) => val?.includes('4K') ? <span className="text-cyan-300 font-bold">4K UHD</span> : val || '1080p'
    },
    {
      header: 'FPS',
      accessor: 'fps',
      className: 'text-xs font-mono text-emerald-400 font-bold',
      render: (val) => `${val || 30} FPS`
    },
    {
      header: 'Last Updated',
      accessor: 'updatedAt',
      className: 'text-xs font-mono text-slate-400',
      render: (val) => formatRelativeTime(val)
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => handleOpenLive(row, e)}
            className="p-1.5 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors"
            title="View Live Stream Placeholder"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleOpenDetails(row, e)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Camera Details"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleOpenEdit(row, e)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Edit Configuration"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleToggleStatus(row, e)}
            className={`p-1.5 rounded transition-colors ${
              row.status === 'ONLINE'
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
            }`}
            title={row.status === 'ONLINE' ? 'Turn Offline' : 'Turn Online'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleOpenDelete(row, e)}
            className="p-1.5 rounded bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
            title="Delete Camera"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            Border Camera Fleet Management
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Database: <span className="text-cyan-300 font-bold">cameras</span> • Realtime RTSP Sensor Node Registry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCameras}
            className="p-2 rounded-xl bg-command-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            title="Refresh camera status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-cyan"
          >
            <Plus className="w-4 h-4" />
            Add Camera
          </button>
        </div>
      </div>

      {/* Notifications Alerts */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono flex items-center justify-between shadow-glow-red"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-glow-green"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-command-900/60 border border-slate-800">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1 hidden sm:block" />
          {[
            { label: 'All Cameras', val: 'ALL', count: cameras.length },
            { label: 'Online', val: 'ONLINE', count: cameras.filter(c => c.status === 'ONLINE').length, color: 'text-emerald-400' },
            { label: 'Warning', val: 'WARNING', count: cameras.filter(c => c.status === 'WARNING').length, color: 'text-amber-400' },
            { label: 'Offline', val: 'OFFLINE', count: cameras.filter(c => c.status === 'OFFLINE').length, color: 'text-red-400' },
          ].map(f => (
            <button
              key={f.val}
              onClick={() => setFilterStatus(f.val)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterStatus === f.val
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 border border-slate-700 ${f.color || ''}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Layout toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, name, location..."
              className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-1 bg-command-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Loading, Empty, Table, or Grid */}
      {loading ? (
        /* Loading Skeleton */
        <div className="p-8 rounded-2xl bg-command-900/60 border border-slate-800 animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-12 bg-command-950/80 rounded-xl" />
            ))}
          </div>
        </div>
      ) : filteredCameras.length === 0 ? (
        /* Professional Empty State */
        <EmptyState
          icon={Camera}
          title="No Cameras Found"
          description={
            searchQuery.trim()
              ? `No cameras matching "${searchQuery}".`
              : "No surveillance cameras registered in database."
          }
          action={
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-cyan"
            >
              <Plus className="w-4 h-4" />
              Add First Camera Node
            </button>
          }
        />
      ) : viewMode === 'table' ? (
        /* Table View */
        <DataTable
          columns={columns}
          data={filteredCameras}
          onRowClick={(row) => handleOpenDetails(row)}
        />
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCameras.map(cam => (
            <motion.div
              key={cam.id}
              whileHover={{ y: -3 }}
              onClick={() => handleOpenDetails(cam)}
              className="p-5 rounded-2xl bg-command-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400">{cam.cameraCode}</span>
                    <h3 className="font-bold text-slate-100 text-sm mt-0.5">{cam.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{cam.location}</p>
                  </div>
                  <StatusBadge status={cam.status} pulse={cam.status === 'ONLINE'} />
                </div>

                <div className="mt-4 p-2.5 rounded-xl bg-command-950 border border-slate-800 text-xs font-mono space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span className="text-slate-500">RTSP Stream:</span>
                    <span className="text-slate-300 truncate ml-2">{maskRtspUrl(cam.rtspUrl)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="text-slate-500">Resolution / FPS:</span>
                    <span className="text-slate-200">{cam.resolution} • {cam.fps} FPS</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={(e) => handleOpenLive(cam, e)}
                  className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> View Live Feed
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleOpenEdit(cam, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleOpenDelete(cam, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Camera Modal */}
      {(activeModal === 'add' || activeModal === 'edit') && (
        <Modal
          isOpen={true}
          onClose={() => !submitting && setActiveModal(null)}
          title={activeModal === 'add' ? 'Register New Surveillance Camera' : `Edit Configuration — ${formData.name}`}
          subtitle="RTSP credentials are saved to Supabase 'cameras' table with masked security protection"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Camera Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cameraCode}
                  onChange={(e) => setFormData({ ...formData, cameraCode: e.target.value })}
                  placeholder="e.g. BOP-001"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Camera Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. North Gate Camera"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Location / Sector
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. North Sector"
                className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                RTSP Stream URL
              </label>
              <input
                type="text"
                value={formData.rtspUrl}
                onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                placeholder="rtsp://example-camera/stream"
                className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Resolution
                </label>
                <select
                  value={formData.resolution}
                  onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="1920x1080 (1080p)">1920x1080 (1080p)</option>
                  <option value="3840x2160 (4K)">3840x2160 (4K)</option>
                  <option value="2560x1440 (2K)">2560x1440 (2K)</option>
                  <option value="1280x720 (720p)">1280x720 (720p)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  FPS
                </label>
                <input
                  type="number"
                  value={formData.fps}
                  onChange={(e) => setFormData({ ...formData, fps: Number(e.target.value) })}
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="ONLINE">ONLINE</option>
                  <option value="WARNING">WARNING</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-glow-cyan flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{activeModal === 'add' ? 'Save Camera Node' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Camera Details Modal */}
      {activeModal === 'details' && selectedCamera && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={`Camera Specifications — ${selectedCamera.name}`}
          subtitle={`${selectedCamera.cameraCode} • ${selectedCamera.location}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CAMERA CODE</span>
                <span className="text-cyan-300 font-bold">{selectedCamera.cameraCode}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CURRENT STATUS</span>
                <StatusBadge status={selectedCamera.status} />
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">LOCATION</span>
                <span className="text-slate-200">{selectedCamera.location}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">RESOLUTION & FPS</span>
                <span className="text-slate-200">{selectedCamera.resolution} @ {selectedCamera.fps} FPS</span>
              </div>
            </div>

            {/* Masked RTSP Endpoint box */}
            <div className="p-3.5 rounded-xl bg-command-950 border border-slate-800 text-xs font-mono space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase">Encrypted RTSP URL Endpoint</span>
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>{maskRtspUrl(selectedCamera.rtspUrl)}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Credentials securely masked for defense compliance.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CREATED DATE</span>
                <span className="text-slate-300">{formatDateTime(selectedCamera.createdAt)}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">LAST UPDATED</span>
                <span className="text-slate-300">{formatDateTime(selectedCamera.updatedAt)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  setActiveModal('live');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-glow-cyan"
              >
                <Eye className="w-4 h-4" />
                View Live Stream
              </button>

              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Live Video Stream Placeholder Modal (Requirement 9) */}
      {activeModal === 'live' && selectedCamera && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={`Live Surveillance Placeholder — ${selectedCamera.name}`}
          subtitle={`${selectedCamera.cameraCode} • ${selectedCamera.location}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            {/* Visual Stream Container Placeholder */}
            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black flex flex-col justify-between p-4">
              {/* Top Bar HUD */}
              <div className="flex items-center justify-between z-10 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/90 text-white font-bold text-[10px] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    LIVE
                  </span>
                  <span className="font-bold text-white bg-black/70 px-2 py-0.5 rounded border border-slate-800">
                    {selectedCamera.name}
                  </span>
                </div>

                <StatusBadge status={selectedCamera.status} pulse={selectedCamera.status === 'ONLINE'} />
              </div>

              {/* Center Informational Video Graphic */}
              <div className="my-auto text-center space-y-2 z-10">
                <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 animate-pulse">
                  <Radio className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold font-mono text-slate-100">
                  RTSP Stream Standby: {selectedCamera.location}
                </h4>
                <p className="text-xs text-cyan-300 font-mono max-w-md mx-auto">
                  "AI video stream will be connected through the IBVAP FastAPI inference service."
                </p>
              </div>

              {/* Bottom HUD Bar */}
              <div className="flex items-center justify-between z-10 font-mono text-[10px] text-slate-400 bg-black/80 px-3 py-1 rounded">
                <span>FORMAT: {selectedCamera.resolution} @ {selectedCamera.fps} FPS</span>
                <span>ENDPOINT: {maskRtspUrl(selectedCamera.rtspUrl)}</span>
              </div>

              {/* CCTV Scanline overlay */}
              <div className="cctv-scanline absolute inset-0 pointer-events-none opacity-20" />
            </div>

            {/* Future Architecture Pipeline Diagram */}
            <div className="p-4 rounded-xl bg-command-950 border border-slate-800 text-xs font-mono space-y-2">
              <h5 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Planned FastAPI Inference Pipeline Architecture:
              </h5>
              
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300 pt-1">
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">RTSP Camera</span>
                <ArrowRight className="w-3 h-3 text-cyan-400" />
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">FastAPI</span>
                <ArrowRight className="w-3 h-3 text-cyan-400" />
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">OpenCV</span>
                <ArrowRight className="w-3 h-3 text-cyan-400" />
                <span className="px-2 py-1 rounded bg-slate-900 border border-cyan-500/40 text-cyan-300">YOLO</span>
                <ArrowRight className="w-3 h-3 text-cyan-400" />
                <span className="px-2 py-1 rounded bg-slate-900 border border-emerald-500/40 text-emerald-300">ByteTrack</span>
                <ArrowRight className="w-3 h-3 text-cyan-400" />
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">AI Events</span>
                <ArrowRight className="w-3 h-3 text-cyan-400" />
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700">Supabase</span>
                <ArrowRight className="w-3 h-3 text-cyan-400" />
                <span className="px-2 py-1 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold">React Dashboard</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Close Stream
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {activeModal === 'delete' && selectedCamera && (
        <Modal
          isOpen={true}
          onClose={() => !submitting && setActiveModal(null)}
          title="Confirm Camera Removal"
          subtitle={`Are you sure you want to remove ${selectedCamera.name}?`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-100 mb-1">
                  Delete {selectedCamera.name} ({selectedCamera.cameraCode})?
                </p>
                <p className="text-slate-400">
                  This will permanently remove the camera node from the <code>cameras</code> database table and disconnect telemetry streams.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs shadow-glow-red flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Camera Node</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
