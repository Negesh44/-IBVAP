import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  ShieldCheck, 
  KeyRound, 
  Edit, 
  Trash2, 
  Clock, 
  Lock,
  Mail,
  Building
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { profilesService } from '../services/profilesService';
import { auditLogsService } from '../services/auditLogsService';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'OPERATOR',
    department: 'Surveillance Intelligence Unit',
    badgeNumber: '',
    status: 'ACTIVE'
  });

  const loadUsers = async () => {
    const list = await profilesService.getAll();
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    await profilesService.create(formData);
    await auditLogsService.log('User Registered', `Created operator profile for ${formData.name} (${formData.role})`, 'Admin', 'ADMIN');
    setActiveModal(false);
    loadUsers();
  };

  const handleRoleChange = async (id, newRole) => {
    await profilesService.updateRole(id, newRole);
    await auditLogsService.log('Role Modified', `Updated user #${id} permissions to ${newRole}`, 'Admin', 'ADMIN');
    loadUsers();
  };

  const filteredUsers = users.filter(u => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns = [
    {
      header: 'Officer / Operator',
      accessor: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt={val}
            className="w-9 h-9 rounded-xl object-cover border border-slate-700"
          />
          <div>
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{val}</span>
              {row.twoFactorEnabled && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" title="2FA Hardware Key Enabled" />
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-400">{row.department}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Government Email',
      accessor: 'email',
      className: 'font-mono text-xs text-slate-300'
    },
    {
      header: 'System Role (RBAC)',
      accessor: 'role',
      render: (val, row) => {
        const roleColor = {
          ADMIN: 'bg-red-500/20 text-red-300 border-red-500/40',
          COMMANDER: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          OPERATOR: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          VIEWER: 'bg-slate-800 text-slate-400 border-slate-700'
        }[val] || 'bg-slate-800 text-slate-300 border-slate-700';

        return (
          <select
            value={val}
            onChange={(e) => handleRoleChange(row.id, e.target.value)}
            className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border focus:outline-none bg-command-950 ${roleColor}`}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="COMMANDER">COMMANDER</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        );
      }
    },
    {
      header: 'Account Status',
      accessor: 'status',
      render: (val) => <StatusBadge status={val} pulse={val === 'ACTIVE'} />
    },
    {
      header: 'Last Authentication',
      accessor: 'lastLogin',
      className: 'font-mono text-xs text-slate-400',
      render: (val) => formatDateTime(val)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30">
              ADMINISTRATIVE ACCESS ONLY
            </span>
            <span className="text-xs font-mono text-slate-400">
              RBAC Matrix v1.4
            </span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Command Operators & User Directory
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Role-Based Access Control, Biometric Session Keys & Clearance Management
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: '',
              email: '',
              role: 'OPERATOR',
              department: 'Border Defense Intelligence',
              badgeNumber: `TAC-${Math.floor(100 + Math.random() * 900)}`,
              status: 'ACTIVE'
            });
            setActiveModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-cyan"
        >
          <UserPlus className="w-4 h-4" />
          Add Command User
        </button>
      </div>

      {/* Role Matrix Helper Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { role: 'ADMIN', color: 'border-red-500/30 bg-red-950/10 text-red-300', desc: 'Full system root access, user RBAC, camera config & model updates.' },
          { role: 'COMMANDER', color: 'border-amber-500/30 bg-amber-950/10 text-amber-300', desc: 'Alert triage, QRT tactical dispatch, evidence export & intelligence review.' },
          { role: 'OPERATOR', color: 'border-cyan-500/30 bg-cyan-950/10 text-cyan-300', desc: 'Live CCTV monitoring, PTZ slewing, alarm acknowledgment.' },
          { role: 'VIEWER', color: 'border-slate-700 bg-slate-900/40 text-slate-400', desc: 'Read-only access to live surveillance feeds and forensic audit reports.' }
        ].map(r => (
          <div key={r.role} className={`p-3 rounded-xl border ${r.color} text-xs font-mono`}>
            <div className="font-bold flex items-center justify-between">
              <span>{r.role}</span>
              <Shield className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex justify-between items-center p-3 rounded-xl bg-command-900/60 border border-slate-800">
        <div className="text-xs font-mono text-slate-400">
          Total Authorized Accounts: <span className="text-cyan-300 font-bold">{users.length}</span>
        </div>
        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, email..."
            className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
      />

      {/* Add User Modal */}
      {activeModal && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(false)}
          title="Create New Command Center Operator"
          subtitle="Assign Role, Official Email & Security Clearance"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Full Officer Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Insp. Amit Verma"
                className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Government Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="officer.name@ibvap.gov.in"
                className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Assigned RBAC Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="COMMANDER">COMMANDER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Tactical Badge ID
                </label>
                <input
                  type="text"
                  value={formData.badgeNumber}
                  onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                  placeholder="TAC-882"
                  className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Department / Battalion
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. 142nd BSF Surveillance Division"
                className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-glow-cyan"
              >
                Issue Access Credentials
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
