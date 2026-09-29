import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Edit, 
  Clock, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  UserX, 
  UserCheck, 
  Filter, 
  Calendar, 
  Building2, 
  KeyRound, 
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { profilesService, auditLogsService } from '../services/profilesService';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

const ROLE_CONFIGS = {
  ADMIN: {
    bg: 'bg-red-500/20 text-red-300 border-red-500/40',
    badge: 'bg-red-500/10 text-red-400 border-red-500/30',
    desc: 'Full administrative access, user clearance modification, audit inspection.'
  },
  COMMANDER: {
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    desc: 'Operational supervision, QRT dispatch, alert triage, intelligence forensic analysis.'
  },
  OPERATOR: {
    bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    desc: 'Live multi-feed surveillance monitoring, alarm acknowledgment, PTZ slewing.'
  },
  VIEWER: {
    bg: 'bg-slate-800 text-slate-300 border-slate-700',
    badge: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
    desc: 'Read-only access to live surveillance streams, activity logs and analytics.'
  }
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Drawers
  const [selectedUser, setSelectedUser] = useState(null); // for detail panel
  const [editingRoleUser, setEditingRoleUser] = useState(null); // for role edit modal
  const [newRoleValue, setNewRoleValue] = useState('OPERATOR');
  const [createUserModal, setCreateUserModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'OPERATOR',
    department: 'Border Security Command',
    badgeNumber: '',
    status: 'ACTIVE'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await profilesService.getAll();
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Unauthorized: Only ADMIN users can register new operators.');
      return;
    }

    try {
      const created = await profilesService.create(formData);
      await auditLogsService.log({
        action: 'User Registered',
        resourceType: 'User',
        resourceId: created.id,
        details: `Created user profile for ${formData.name} (${formData.role}) with email ${formData.email}`,
        user: currentUser?.name || 'Administrator',
        userRole: currentUser?.role || 'ADMIN',
        userId: currentUser?.id
      });
      setCreateUserModal(false);
      showToast(`User ${formData.name} created successfully.`);
      loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      alert('Failed to register user.');
    }
  };

  const handleRoleUpdate = async () => {
    if (!isAdmin) {
      alert('Permission Denied: Only ADMIN accounts can modify clearance roles.');
      return;
    }
    if (!editingRoleUser) return;

    try {
      await profilesService.updateRole(editingRoleUser.id, newRoleValue);
      await auditLogsService.log({
        action: 'Change User Role',
        resourceType: 'User',
        resourceId: editingRoleUser.id,
        details: `Updated role for ${editingRoleUser.name} (${editingRoleUser.email}) from ${editingRoleUser.role} to ${newRoleValue}`,
        user: currentUser?.name || 'Administrator',
        userRole: currentUser?.role || 'ADMIN',
        userId: currentUser?.id
      });

      showToast(`Role for ${editingRoleUser.name} updated to ${newRoleValue}.`);
      setEditingRoleUser(null);
      if (selectedUser && selectedUser.id === editingRoleUser.id) {
        setSelectedUser({ ...selectedUser, role: newRoleValue });
      }
      loadUsers();
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Error updating user role.');
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (!isAdmin) {
      alert('Permission Denied: Only ADMIN accounts can modify user status.');
      return;
    }

    // Prevent user from disabling their own account
    if (targetUser.id === currentUser?.id || targetUser.email === currentUser?.email) {
      alert('Security Policy: You cannot disable or lock your own active session account.');
      return;
    }

    const nextStatus = targetUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await profilesService.updateStatus(targetUser.id, nextStatus);
      await auditLogsService.log({
        action: nextStatus === 'ACTIVE' ? 'User Enabled' : 'User Disabled',
        resourceType: 'User',
        resourceId: targetUser.id,
        details: `Account status for ${targetUser.name} changed to ${nextStatus}`,
        user: currentUser?.name || 'Administrator',
        userRole: currentUser?.role || 'ADMIN',
        userId: currentUser?.id
      });

      showToast(`Account status for ${targetUser.name} set to ${nextStatus}.`);
      if (selectedUser && selectedUser.id === targetUser.id) {
        setSelectedUser({ ...selectedUser, status: nextStatus });
      }
      loadUsers();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Error updating user status.');
    }
  };

  // Filter logic
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchBadge = (u.badgeNumber || '').toLowerCase().includes(q);
      const matchDept = (u.department || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchBadge && !matchDept) return false;
    }
    return true;
  });

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (val, row) => (
        <div 
          onClick={() => setSelectedUser(row)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img
            src={row.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt={val}
            className="w-9 h-9 rounded-xl object-cover border border-slate-700 group-hover:border-cyan-400 transition-colors"
          />
          <div>
            <div className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
              <span>{val}</span>
              {row.twoFactorEnabled && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" title="2FA Verified" />
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-400">{row.badgeNumber || 'TAC-001'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      className: 'font-mono text-xs text-slate-300'
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (val) => {
        const config = ROLE_CONFIGS[val] || ROLE_CONFIGS.VIEWER;
        return (
          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${config.badge}`}>
            {val}
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
            val === 'ACTIVE'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/15 text-red-400 border-red-500/30'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              val === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          {val}
        </span>
      )
    },
    {
      header: 'Created At',
      accessor: 'createdAt',
      className: 'font-mono text-xs text-slate-400',
      render: (val) => formatDateTime(val)
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => {
        const isSelf = row.id === currentUser?.id || row.email === currentUser?.email;
        return (
          <div className="flex items-center gap-2">
            {/* View Details */}
            <button
              onClick={() => setSelectedUser(row)}
              className="p-1.5 rounded-lg bg-command-950 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 hover:text-cyan-300 transition-colors"
              title="View User Dossier"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Edit Role (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingRoleUser(row);
                  setNewRoleValue(row.role || 'OPERATOR');
                }}
                className="p-1.5 rounded-lg bg-command-950 hover:bg-slate-800 border border-slate-700/80 text-amber-400 hover:text-amber-300 transition-colors"
                title="Edit Role / Clearance"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Disable / Enable Action */}
            {isAdmin && !isSelf && (
              <button
                onClick={() => handleToggleStatus(row)}
                className={`p-1.5 rounded-lg bg-command-950 hover:bg-slate-800 border transition-colors ${
                  row.status === 'ACTIVE'
                    ? 'border-red-500/30 text-red-400 hover:text-red-300'
                    : 'border-emerald-500/30 text-emerald-400 hover:text-emerald-300'
                }`}
                title={row.status === 'ACTIVE' ? 'Disable Account' : 'Enable Account'}
              >
                {row.status === 'ACTIVE' ? (
                  <UserX className="w-3.5 h-3.5" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-command-900 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2 shadow-glow-cyan animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30">
              ADMINISTRATION MODULE
            </span>
            <span className="text-xs font-mono text-slate-400">
              Supabase Profiles & RBAC
            </span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Command Center User Accounts
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Role assignments (ADMIN, COMMANDER, OPERATOR, VIEWER), account status and clearance management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 rounded-xl bg-command-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAdmin && (
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
                setCreateUserModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-cyan"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Role Clearance Overview Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(ROLE_CONFIGS).map(([rName, cfg]) => {
          const count = users.filter((u) => u.role === rName).length;
          return (
            <div
              key={rName}
              onClick={() => setRoleFilter(roleFilter === rName ? 'ALL' : rName)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                roleFilter === rName
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-glow-cyan'
                  : 'bg-command-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${cfg.badge}`}>
                  {rName}
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {count} {count === 1 ? 'User' : 'Users'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed font-mono">
                {cfg.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-command-900/60 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider hidden sm:inline">Role:</span>
            <div className="flex items-center gap-1 bg-command-950 p-1 rounded-lg border border-slate-800">
              {['ALL', 'ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    roleFilter === r
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider hidden sm:inline">Status:</span>
            <div className="flex items-center gap-1 bg-command-950 p-1 rounded-lg border border-slate-800">
              {['ALL', 'ACTIVE', 'DISABLED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    statusFilter === s
                      ? s === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : s === 'DISABLED'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, badge..."
            className="w-full pl-8 pr-3 py-1.5 bg-command-950 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Users Data Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
      />

      {/* User Details Slide-over / Modal */}
      {selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          title="User Account Dossier"
          subtitle={`Clearance ID: ${selectedUser.id}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-5">
            {/* Header profile banner */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-command-950 border border-slate-800">
              <img
                src={selectedUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt={selectedUser.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/40"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <span>{selectedUser.name}</span>
                  {selectedUser.twoFactorEnabled && (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" title="2FA Hardware Key Active" />
                  )}
                </h3>
                <p className="text-xs font-mono text-slate-400 truncate">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${ROLE_CONFIGS[selectedUser.role]?.badge || 'bg-slate-800 text-slate-300'}`}>
                    {selectedUser.role}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${selectedUser.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
                    {selectedUser.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed metadata list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Full Name</span>
                <span className="text-slate-200 font-semibold mt-0.5 block">{selectedUser.name}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Official Email</span>
                <span className="text-slate-200 font-semibold mt-0.5 block truncate">{selectedUser.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Account Status</span>
                <span className={`font-bold mt-0.5 block ${selectedUser.status === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {selectedUser.status}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Assigned RBAC Role</span>
                <span className="text-cyan-400 font-bold mt-0.5 block">{selectedUser.role}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Created Date</span>
                <span className="text-slate-300 mt-0.5 block">{formatDateTime(selectedUser.createdAt)}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Tactical Badge ID</span>
                <span className="text-slate-300 mt-0.5 block">{selectedUser.badgeNumber || 'TAC-001'}</span>
              </div>
            </div>

            {/* Actions in Detail Panel */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-500">
                {isAdmin ? 'ADMIN privileges enabled' : 'Read-only access (Non-Admin)'}
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingRoleUser(selectedUser);
                      setNewRoleValue(selectedUser.role || 'OPERATOR');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit Role
                  </button>
                )}

                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Role Modal (ADMIN Only) */}
      {editingRoleUser && isAdmin && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRoleUser(null)}
          title="Modify Clearance Role (RBAC)"
          subtitle={`User: ${editingRoleUser.name} (${editingRoleUser.email})`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">RBAC Security Notice:</span>
                Changing this role will immediately update system permissions and audit access for this operator.
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-2">
                Select New Access Role:
              </label>
              <div className="space-y-2">
                {['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER'].map((r) => (
                  <label
                    key={r}
                    onClick={() => setNewRoleValue(r)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      newRoleValue === r
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-glow-cyan'
                        : 'bg-command-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleOption"
                      checked={newRoleValue === r}
                      onChange={() => setNewRoleValue(r)}
                      className="mt-0.5 text-cyan-500 focus:ring-cyan-400"
                    />
                    <div className="text-xs font-mono">
                      <div className="font-bold text-slate-100 flex items-center gap-2">
                        <span>{r}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border ${ROLE_CONFIGS[r].badge}`}>
                          {ROLE_CONFIGS[r].badge.includes('red') ? 'Root Access' : 'Standard'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {ROLE_CONFIGS[r].desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRoleUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRoleUpdate}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-glow-cyan transition-colors"
              >
                Apply Role Update
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add User Modal */}
      {createUserModal && isAdmin && (
        <Modal
          isOpen={true}
          onClose={() => setCreateUserModal(false)}
          title="Register New Command Center Operator"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCreateUserModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-glow-cyan transition-colors"
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
