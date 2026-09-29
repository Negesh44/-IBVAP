import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  ShieldCheck, 
  Fingerprint, 
  Cpu, 
  Building, 
  Phone, 
  Mail, 
  Award,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import { friendlyPersonsService } from '../services/friendlyPersonsService';
import { auditLogsService } from '../services/auditLogsService';

export default function FriendlyPersons() {
  const [persons, setPersons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'edit' | 'view'
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    personId: '',
    department: 'Border Security Force',
    role: '',
    rank: '',
    unit: '',
    station: '',
    avatar: '',
    clearanceLevel: 'Level 3 (Operational)',
    status: 'FRIENDLY'
  });

  const loadPersons = async () => {
    setLoading(true);
    try {
      const data = await friendlyPersonsService.getAll();
      setPersons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersons();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      fullName: '',
      personId: `BSF-${Math.floor(1000 + Math.random() * 9000)}`,
      department: 'Border Security Force',
      role: 'Surveillance Officer',
      rank: 'Inspector',
      unit: '142nd BSF Battalion',
      station: 'North Sector Post',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      clearanceLevel: 'Level 3 (Operational)',
      status: 'FRIENDLY'
    });
    setActiveModal('add');
  };

  const handleOpenEdit = (person, e) => {
    e?.stopPropagation();
    setSelectedPerson(person);
    setFormData({ ...person });
    setActiveModal('edit');
  };

  const handleOpenView = (person) => {
    setSelectedPerson(person);
    setActiveModal('view');
  };

  const handleDelete = async (id, name, e) => {
    e?.stopPropagation();
    if (confirm(`Are you sure you want to remove ${name} from the Friendly Person database?`)) {
      await friendlyPersonsService.delete(id);
      await auditLogsService.log('Friendly Person Removed', `Removed ${name} (${id})`, 'Commander', 'ADMIN');
      loadPersons();
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (activeModal === 'add') {
      await friendlyPersonsService.create(formData);
      await auditLogsService.log('Friendly Person Added', `Enrolled ${formData.fullName} (${formData.personId}) into Face Recognition DB`, 'Commander', 'ADMIN');
    } else if (activeModal === 'edit' && selectedPerson) {
      await friendlyPersonsService.update(selectedPerson.id, formData);
      await auditLogsService.log('Friendly Person Updated', `Updated records for ${formData.fullName}`, 'Commander', 'ADMIN');
    }
    setActiveModal(null);
    loadPersons();
  };

  const filteredPersons = persons.filter(p => {
    if (selectedDept !== 'ALL' && !p.department.includes(selectedDept)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.personId.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.unit?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            Friendly Persons & Biometric Identity Vault
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Authorized Personnel, 512-dim Face Embeddings & Rapid Whitelist Access Verification
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-green"
        >
          <Plus className="w-4 h-4" />
          Enroll Friendly Person
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-command-900/60 border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1 hidden sm:block" />
          {['ALL', 'BSF', 'Army', 'ITBP'].map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedDept === dept
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {dept === 'ALL' ? 'All Units' : dept}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, rank..."
            className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Personnel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPersons.map(person => (
          <motion.div
            key={person.id}
            whileHover={{ y: -3 }}
            onClick={() => handleOpenView(person)}
            className="p-5 rounded-2xl bg-command-900/90 border border-slate-800/80 hover:border-emerald-500/40 transition-all cursor-pointer backdrop-blur-xl flex flex-col justify-between group shadow-lg"
          >
            <div>
              {/* Card Header & Avatar */}
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <img
                    src={person.avatar}
                    alt={person.fullName}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500/40 group-hover:border-emerald-400 transition-colors"
                  />
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-command-950 rounded-full">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-bold text-slate-100 text-sm truncate">
                      {person.fullName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      FRIENDLY
                    </span>
                  </div>

                  <p className="text-xs font-mono font-semibold text-cyan-400 mt-0.5">
                    {person.personId}
                  </p>

                  <p className="text-xs text-slate-300 truncate mt-0.5">
                    {person.role}
                  </p>
                </div>
              </div>

              {/* Personnel Metadata Info */}
              <div className="mt-4 p-2.5 rounded-xl bg-command-950/80 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-200 truncate ml-2">{person.department}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="text-slate-500">Unit / Post:</span>
                  <span className="text-slate-300 truncate ml-2">{person.station || person.unit || 'Frontier Post'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="text-slate-500">Face Match Conf:</span>
                  <span className="text-emerald-400 font-bold">
                    {person.confidenceScore ? `${(person.confidenceScore * 100).toFixed(1)}%` : '98.5%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                Embedding: {person.embeddingHash?.slice(0, 10) || 'Registered'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => handleOpenEdit(person, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                  title="Edit Identity"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(person.id, person.fullName, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Remove from Whitelist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add / Edit Friendly Person Modal */}
      {(activeModal === 'add' || activeModal === 'edit') && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={activeModal === 'add' ? 'Enroll New Friendly Person' : `Edit Identity — ${formData.fullName}`}
          subtitle="Biometric Identity Enrollment for Automated Facial Recognition Pipeline"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Arun Kumar"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Service / Person ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.personId}
                  onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
                  placeholder="e.g. BSF-1024"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="Border Security Force">Border Security Force (BSF)</option>
                  <option value="Indian Army — Border Division">Indian Army — Border Division</option>
                  <option value="Indo-Tibetan Border Police">Indo-Tibetan Border Police (ITBP)</option>
                  <option value="Sashastra Seema Bal">Sashastra Seema Bal (SSB)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Role / Designation *
                </label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Patrol Team Leader"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Station / Outpost
                </label>
                <input
                  type="text"
                  value={formData.station}
                  onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                  placeholder="e.g. BOP North Sector"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Security Clearance
                </label>
                <select
                  value={formData.clearanceLevel}
                  onChange={(e) => setFormData({ ...formData, clearanceLevel: e.target.value })}
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="Level 2 (Field Active)">Level 2 (Field Active)</option>
                  <option value="Level 3 (Operational)">Level 3 (Operational)</option>
                  <option value="Level 4 (High Command)">Level 4 (High Command)</option>
                  <option value="Level 5 (Top Secret)">Level 5 (Top Secret)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Photo Reference URL
              </label>
              <input
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="https://..."
                className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Neural Embedding notice box */}
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>Face recognition embedding vector (512-dim) will be generated & synced to AI inference models.</span>
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
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-glow-green"
              >
                {activeModal === 'add' ? 'Enroll Biometric Identity' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Full Identity Profile Modal */}
      {activeModal === 'view' && selectedPerson && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={`Personnel Identity Dossier — ${selectedPerson.fullName}`}
          subtitle={`${selectedPerson.personId} • ${selectedPerson.department}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-command-950/80 border border-slate-800">
              <img
                src={selectedPerson.avatar}
                alt={selectedPerson.fullName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-400 shadow-glow-green"
              />
              <div className="text-center sm:text-left space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h3 className="text-lg font-bold text-white">{selectedPerson.fullName}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    FRIENDLY
                  </span>
                </div>
                <p className="text-xs font-mono text-cyan-400 font-bold">{selectedPerson.personId} • {selectedPerson.rank || 'Officer'}</p>
                <p className="text-xs text-slate-300">{selectedPerson.department}</p>
                <p className="text-xs text-slate-500 font-mono">Registered On: {selectedPerson.registeredOn || '2025-11-12'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SECURITY CLEARANCE</span>
                <span className="text-cyan-300 font-bold">{selectedPerson.clearanceLevel}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">LAST VERIFIED TIME</span>
                <span className="text-slate-200">{selectedPerson.lastVerified}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">AI CONFIDENCE SCORE</span>
                <span className="text-emerald-400 font-bold">{(selectedPerson.confidenceScore * 100).toFixed(1)}%</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">EMBEDDING CHECKSUM</span>
                <span className="text-slate-300 font-mono truncate">{selectedPerson.embeddingHash || 'f6e8a0b2...89cf'}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
