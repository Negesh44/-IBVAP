import React, { useState } from 'react';
import { 
  Camera, 
  Plus, 
  Search, 
  Sliders, 
  Eye, 
  Edit3, 
  Power, 
  Trash2, 
  Radio, 
  Wifi, 
  KeyRound, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CameraControlModal from '../components/surveillance/CameraControlModal';
import SurveillanceFeed from '../components/surveillance/SurveillanceFeed';
import { useSurveillance } from '../contexts/SurveillanceContext';
import { camerasService } from '../services/camerasService';
import { auditLogsService } from '../services/auditLogsService';
import { formatRelativeTime } from '../utils/formatters';

export default function Cameras() {
  const { cameras, refreshAll } = useSurveillance();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'edit' | 'view'
  const [selectedCam, setSelectedCam] = useState(null);
  const [configCam, setConfigCam] = useState(null);

  // Form State (Password is never exposed in display)
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    location: '',
    sector: 'North',
    rtspUrl: 'rtsp://192.168.10.108:554/live/stream1',
    username: 'admin_surveillance',
    password: '',
    type: 'PTZ Thermal + Optical',
    resolution: '3840x2160 (4K)',
    fps: 30,
    status: 'ONLINE'
  });

  const handleOpenAdd = () => {
    const nextNum = cameras.length + 1;
    setFormData({
      name: `BOP-${nextNum < 10 ? '0' + nextNum : nextNum} Perimeter View`,
      id: `CAM-BOP-${nextNum < 10 ? '0' + nextNum : nextNum}`,
      location: 'North Sector — Border Line',
      sector: 'North',
      rtspUrl: `rtsp://192.168.10.1${nextNum < 10 ? '0' + nextNum : nextNum}:554/live/stream1`,
      username: 'admin_surveillance',
      password: '',
      type: 'PTZ Thermal + Optical',
      resolution: '3840x2160 (4K)',
      fps: 30,
      status: 'ONLINE'
    });
    setActiveModal('add');
  };

  const handleOpenEdit = (cam, e) => {
    e?.stopPropagation();
    setSelectedCam(cam);
    setFormData({
      ...cam,
      password: '' // Kept blank for security
    });
    setActiveModal('edit');
  };

  const handleToggleStatus = async (cam, e) => {
    e?.stopPropagation();
    await camerasService.toggleStatus(cam.id);
    await auditLogsService.log(
      cam.status === 'ONLINE' ? 'Camera Disabled' : 'Camera Enabled',
      `${cam.name} (${cam.id}) status toggled`,
      'Commander',
      'ADMIN'
    );
    refreshAll();
  };

  const handleDelete = async (id, name, e) => {
    e?.stopPropagation();
    if (confirm(`Remove camera ${name} from active network register?`)) {
      await camerasService.delete(id);
      await auditLogsService.log('Camera Deleted', `Removed ${name} (${id})`, 'Commander', 'ADMIN');
      refreshAll();
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (activeModal === 'add') {
      await camerasService.create(formData);
      await auditLogsService.log('Camera Configured', `Registered ${formData.name} (${formData.id})`, 'Commander', 'ADMIN');
    } else if (activeModal === 'edit' && selectedCam) {
      await camerasService.update(selectedCam.id, formData);
      await auditLogsService.log('Camera Configured', `Updated ${formData.name}`, 'Commander', 'ADMIN');
    }
    setActiveModal(null);
    refreshAll();
  };

  const filteredCameras = cameras.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns = [
    {
      header: 'Camera ID',
      accessor: 'id',
      className: 'font-mono text-cyan-400 font-bold',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${row.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-red-500'}`} />
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
          <div className="text-[11px] font-mono text-slate-500">{row.rtspUrl || 'rtsp://...'}</div>
        </div>
      )
    },
    {
      header: 'Location',
      accessor: 'location',
      className: 'text-xs text-slate-300 font-mono'
    },
    {
      header: 'Type',
      accessor: 'type',
      className: 'text-xs text-slate-400 font-mono'
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
      render: (val) => val?.includes('4K') ? <span className="text-cyan-300 font-bold">4K UHD</span> : '1080p'
    },
    {
      header: 'FPS',
      accessor: 'fps',
      className: 'text-xs font-mono text-emerald-400 font-bold',
      render: (val) => `${val || 30} FPS`
    },
    {
      header: 'Last Seen',
      accessor: 'lastSeen',
      className: 'text-xs font-mono text-slate-400',
      render: (val) => formatRelativeTime(val)
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedCam(row);
              setActiveModal('view');
            }}
            className="p-1.5 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors"
            title="View Live Stream"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfigCam(row)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Configure PTZ & Sensitivities"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleOpenEdit(row, e)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Edit RTSP Credentials"
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
            title={row.status === 'ONLINE' ? 'Disable Stream' : 'Enable Stream'}
          >
            <Power className="w-3.5 h-3.5" />
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
            RTSP Stream Integrations, Thermal Sensors, PTZ Protocols & Hardware Telemetry
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-cyan"
        >
          <Plus className="w-4 h-4" />
          Add Surveillance Camera
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-command-900/60 border border-slate-800">
        <div className="text-xs font-mono text-slate-400">
          Showing <span className="text-cyan-300 font-bold">{filteredCameras.length}</span> registered surveillance units
        </div>

        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, sector..."
            className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Camera Table */}
      <DataTable
        columns={columns}
        data={filteredCameras}
        onRowClick={(row) => {
          setSelectedCam(row);
          setActiveModal('view');
        }}
      />

      {/* Add / Edit Camera Modal */}
      {(activeModal === 'add' || activeModal === 'edit') && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={activeModal === 'add' ? 'Register New Camera Node' : `Edit Camera Configuration — ${formData.name}`}
          subtitle="Configure RTSP Endpoint & Security Credential Handshake"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Camera Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. BOP-05 Riverbank Watch"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Camera ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g. CAM-BOP-05"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Location / Sector *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. West Sector — River Corridor"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Hardware Sensor Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="PTZ Thermal + Optical">PTZ Thermal + Optical (Dual-Spectrum)</option>
                  <option value="Long-Range Thermal Sensor">Long-Range Thermal Sensor</option>
                  <option value="Ultra-HD Optical Bullet">Ultra-HD Optical Bullet (4K)</option>
                  <option value="ANPR + Face Capture PTZ">ANPR + Face Capture PTZ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                RTSP Stream URL *
              </label>
              <input
                type="text"
                required
                value={formData.rtspUrl}
                onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                placeholder="rtsp://192.168.10.x:554/live/stream1"
                className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  RTSP Authentication Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  RTSP Password (Kept Encrypted)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-glow-cyan"
              >
                {activeModal === 'add' ? 'Save & Connect Stream' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Live Stream Modal */}
      {activeModal === 'view' && selectedCam && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={`Camera Inspection Feed — ${selectedCam.name}`}
          subtitle={`${selectedCam.id} • ${selectedCam.location}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <SurveillanceFeed
              camera={selectedCam}
              showControls={true}
              className="w-full h-80"
            />

            <div className="flex justify-between items-center pt-2">
              <div className="text-xs font-mono text-slate-400">
                Stream Link: <span className="text-cyan-400">{selectedCam.rtspUrl}</span>
              </div>
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

      {/* PTZ Configuration Modal */}
      {configCam && (
        <CameraControlModal
          camera={configCam}
          isOpen={!!configCam}
          onClose={() => setConfigCam(null)}
        />
      )}
    </div>
  );
}
