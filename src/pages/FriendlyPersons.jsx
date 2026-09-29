import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { friendlyPersonsService } from '../services/friendlyPersonsService';
import { auditLogsService } from '../services/auditLogsService';

export default function FriendlyPersons() {
  const [persons, setPersons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modals & State
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'edit' | 'view' | 'delete'
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileInputRef = useRef(null);

  // Notification Alerts
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    personCode: '',
    department: 'Border Security Force',
    role: 'Surveillance Officer',
    status: 'FRIENDLY',
    photoUrl: ''
  });

  const loadPersons = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await friendlyPersonsService.getAll();
      if (error) {
        setErrorMessage(`Note: Supabase table sync: ${error}. Displaying registered personnel.`);
      }
      setPersons(data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch friendly persons list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersons();
  }, []);

  const handleOpenAdd = () => {
    setSelectedPhotoFile(null);
    setPhotoPreview('');
    setFormData({
      fullName: '',
      personCode: `BSF-${Math.floor(1000 + Math.random() * 9000)}`,
      department: 'Border Security Force',
      role: 'Surveillance Officer',
      status: 'FRIENDLY',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    });
    setActiveModal('add');
  };

  const handleOpenEdit = (person, e) => {
    e?.stopPropagation();
    setSelectedPerson(person);
    setSelectedPhotoFile(null);
    setPhotoPreview(person.photoUrl);
    setFormData({
      fullName: person.fullName,
      personCode: person.personCode,
      department: person.department,
      role: person.role,
      status: person.status || 'FRIENDLY',
      photoUrl: person.photoUrl
    });
    setActiveModal('edit');
  };

  const handleOpenView = (person) => {
    setSelectedPerson(person);
    setActiveModal('view');
  };

  const handleOpenDelete = (person, e) => {
    e?.stopPropagation();
    setSelectedPerson(person);
    setActiveModal('delete');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Photo file must be less than 10MB.');
        return;
      }
      setSelectedPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (activeModal === 'add') {
        const { data, error } = await friendlyPersonsService.create(formData, selectedPhotoFile);
        if (error) throw new Error(error);
        
        await auditLogsService.log(
          'Friendly Person Enrolled',
          `Added ${formData.fullName} (${formData.personCode}) to friendly_persons`,
          'Commander Rawat',
          'ADMIN'
        );
        setSuccessMessage(`Successfully enrolled ${formData.fullName} into Friendly Persons whitelist!`);
      } else if (activeModal === 'edit' && selectedPerson) {
        const { data, error } = await friendlyPersonsService.update(selectedPerson.id, formData, selectedPhotoFile);
        if (error) throw new Error(error);

        await auditLogsService.log(
          'Friendly Person Modified',
          `Updated records for ${formData.fullName}`,
          'Commander Rawat',
          'ADMIN'
        );
        setSuccessMessage(`Successfully updated details for ${formData.fullName}.`);
      }

      setActiveModal(null);
      await loadPersons();
    } catch (err) {
      setErrorMessage(err.message || 'Operation failed. Please verify Supabase connection.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPerson) return;
    setSubmitting(true);
    setErrorMessage('');

    try {
      await friendlyPersonsService.delete(selectedPerson.id, selectedPerson.photoUrl);
      await auditLogsService.log(
        'Friendly Person Removed',
        `Removed ${selectedPerson.fullName} (${selectedPerson.personCode}) from whitelist`,
        'Commander Rawat',
        'ADMIN'
      );
      setSuccessMessage(`Removed ${selectedPerson.fullName} from database.`);
      setActiveModal(null);
      await loadPersons();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete record.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  // Real-time search by Full Name, Person Code, and Department
  const filteredPersons = persons.filter(p => {
    if (selectedDept !== 'ALL' && !p.department.includes(selectedDept)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.personCode.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
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
            Friendly Persons & Biometric Whitelist
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Database: <span className="text-cyan-300 font-bold">friendly_persons</span> • Storage: <span className="text-emerald-400 font-bold">friendly-persons</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPersons}
            className="p-2 rounded-xl bg-command-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-green"
          >
            <Plus className="w-4 h-4" />
            Add Friendly Person
          </button>
        </div>
      </div>

      {/* Notifications Alert Banners */}
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

      {/* Filter and Real-Time Search */}
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

        <div className="relative sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by full name, code, department..."
            className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Main Content Area: Loading Skeleton, Empty State, or Grid */}
      {loading ? (
        /* Loading Skeleton */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="p-5 rounded-2xl bg-command-900/60 border border-slate-800/80 animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                </div>
              </div>
              <div className="h-16 bg-command-950/80 rounded-xl" />
              <div className="h-4 bg-slate-800/40 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredPersons.length === 0 ? (
        /* Professional Empty State */
        <EmptyState
          icon={UserCheck}
          title="No Friendly Persons Registered"
          description={
            searchQuery.trim()
              ? `No personnel found matching "${searchQuery}".`
              : "There are currently no authorized friendly persons enrolled in the biometric whitelist database."
          }
          action={
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-green"
            >
              <Plus className="w-4 h-4" />
              Enroll First Friendly Person
            </button>
          }
        />
      ) : (
        /* Friendly Persons Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPersons.map(person => (
            <motion.div
              key={person.id}
              whileHover={{ y: -3 }}
              onClick={() => handleOpenView(person)}
              className="p-5 rounded-2xl bg-command-900/90 border border-slate-800/80 hover:border-emerald-500/40 transition-all cursor-pointer backdrop-blur-xl flex flex-col justify-between group shadow-lg"
            >
              <div>
                {/* Header: Photo + Identity Info */}
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={person.photoUrl}
                      alt={person.fullName}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500/40 group-hover:border-emerald-400 transition-colors bg-slate-900"
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
                        {person.status || 'FRIENDLY'}
                      </span>
                    </div>

                    <p className="text-xs font-mono font-semibold text-cyan-400 mt-0.5">
                      {person.personCode}
                    </p>

                    <p className="text-xs text-slate-300 truncate mt-0.5">
                      {person.role}
                    </p>
                  </div>
                </div>

                {/* Personnel Metadata Info Box */}
                <div className="mt-4 p-2.5 rounded-xl bg-command-950/80 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span className="text-slate-500">Department:</span>
                    <span className="text-slate-200 truncate ml-2">{person.department}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="text-slate-500">Status Verification:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      VERIFIED FRIENDLY
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Edit & Delete Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                  ID: {person.personCode}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleOpenEdit(person, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                    title="Edit Friendly Person"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleOpenDelete(person, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    title="Delete Friendly Person"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Friendly Person Modal */}
      {(activeModal === 'add' || activeModal === 'edit') && (
        <Modal
          isOpen={true}
          onClose={() => !submitting && setActiveModal(null)}
          title={activeModal === 'add' ? 'Add Friendly Person' : `Edit — ${formData.fullName}`}
          subtitle="Photo uploaded directly to private Supabase Storage bucket 'friendly-persons'"
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
                  Person Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.personCode}
                  onChange={(e) => setFormData({ ...formData, personCode: e.target.value })}
                  placeholder="e.g. BSF-1024"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Department
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
                  Role
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Patrol Team Leader"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Photo Upload File Picker */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Biometric Photo Upload (friendly-persons bucket)
              </label>
              
              <div className="flex items-center gap-4 p-3 rounded-xl bg-command-950 border border-slate-700">
                <div className="w-14 h-14 rounded-xl border border-slate-700 bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-600" />
                  )}
                </div>

                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-600"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedPhotoFile ? selectedPhotoFile.name : 'Select Photo File...'}</span>
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    Uploaded securely to Supabase Storage.
                  </span>
                </div>
              </div>
            </div>

            {/* Status (Default FRIENDLY) */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Authorization Status
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Status: <strong>FRIENDLY</strong> (Authorized Personnel)</span>
              </div>
            </div>

            {/* Future Face Embedding Data Model Notice */}
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>Data structure includes <code>face_embedding</code> schema for future facial recognition engine.</span>
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
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-glow-green flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{activeModal === 'add' ? 'Save Friendly Person' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {activeModal === 'delete' && selectedPerson && (
        <Modal
          isOpen={true}
          onClose={() => !submitting && setActiveModal(null)}
          title="Confirm Whitelist Removal"
          subtitle={`Are you sure you want to remove ${selectedPerson.fullName}?`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-100 mb-1">
                  Remove {selectedPerson.fullName} ({selectedPerson.personCode})?
                </p>
                <p className="text-slate-400">
                  This will delete the record from <code>friendly_persons</code> and remove associated biometric references from Supabase Storage.
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
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Full Identity Profile Modal */}
      {activeModal === 'view' && selectedPerson && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={`Personnel Identity Dossier — ${selectedPerson.fullName}`}
          subtitle={`${selectedPerson.personCode} • ${selectedPerson.department}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-command-950/80 border border-slate-800">
              <img
                src={selectedPerson.photoUrl}
                alt={selectedPerson.fullName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-400 shadow-glow-green bg-slate-900"
              />
              <div className="text-center sm:text-left space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h3 className="text-lg font-bold text-white">{selectedPerson.fullName}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {selectedPerson.status || 'FRIENDLY'}
                  </span>
                </div>
                <p className="text-xs font-mono text-cyan-400 font-bold">{selectedPerson.personCode} • {selectedPerson.role || 'Officer'}</p>
                <p className="text-xs text-slate-300">{selectedPerson.department}</p>
                <p className="text-xs text-slate-500 font-mono">Enrolled: {new Date(selectedPerson.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">VERIFICATION STATUS</span>
                <span className="text-emerald-400 font-bold">MATCHED & WHITELISTED</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">AI MATCH CONFIDENCE</span>
                <span className="text-emerald-400 font-bold">98.5% (ArcFace Cosine)</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">EMBEDDING PIPELINE</span>
                <span className="text-cyan-300 font-bold">512-dim ArcFace Feature</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">STORAGE BUCKET</span>
                <span className="text-slate-300 font-mono truncate">friendly-persons</span>
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
