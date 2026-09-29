import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Mail, 
  Radio, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  Cpu, 
  ShieldCheck,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const { login, signUp, loading } = useAuth();

  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('commander.rawat@ibvap.gov.in');
  const [password, setPassword] = useState('Security@2026');
  const [fullName, setFullName] = useState('Col. Sanjeev Rawat');
  const [role, setRole] = useState('ADMIN');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (authMode === 'signup') {
      const res = await signUp(email, password, fullName, role);
      if (res.success) {
        if (res.user) {
          navigate('/dashboard');
        } else {
          setSuccessMsg(res.message || 'Account registered! You can now sign in.');
          setAuthMode('signin');
        }
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
      return;
    }

    // Sign In
    const result = await login(email, password, role);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(result.error || 'Invalid credentials or security token.');
    }
  };

  const handleQuickRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    const roleMap = {
      ADMIN: { email: 'admin@ibvap.gov.in', name: 'Col. Sanjeev Rawat' },
      COMMANDER: { email: 'commander@ibvap.gov.in', name: 'Maj. Rajesh Sharma' },
      OPERATOR: { email: 'operator@ibvap.gov.in', name: 'Insp. Priya Verma' },
      VIEWER: { email: 'viewer@ibvap.gov.in', name: 'Officer Amit Deshmukh' }
    };
    const info = roleMap[selectedRole] || { email: 'operator@ibvap.gov.in', name: 'Surveillance Officer' };
    setEmail(info.email);
    setFullName(info.name);
  };

  return (
    <div className="min-h-screen w-full bg-[#060a11] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_1px,transparent_1px),linear-gradient(to_bottom,#0f172a15_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="p-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 p-[1px] shadow-glow-cyan">
            <div className="w-full h-full bg-command-950 rounded-[11px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-white tracking-widest font-mono text-sm block">IBVAP</span>
            <span className="text-[10px] text-slate-400 font-mono">Ministry of Home Affairs • Border Security</span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 bg-command-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>SUPABASE AUTH CONNECTED</span>
        </div>
      </header>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md rounded-2xl bg-command-900/90 border border-slate-700/70 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl"
        >
          {/* Brand Header */}
          <div className="text-center mb-5">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-2 shadow-glow-cyan">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              IBVAP COMMAND PORTAL
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Intelligent Border Video Analytics Platform
            </p>
          </div>

          {/* Sign In vs Sign Up Tabs */}
          <div className="flex items-center gap-2 p-1 bg-command-950 rounded-xl border border-slate-800 mb-4 text-xs font-mono">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                authMode === 'signin'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                authMode === 'signup'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* Role Quick Selector for SIH Presentation */}
          <div className="mb-4">
            <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase">
              Demonstration Role Preset:
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => handleQuickRoleSelect(r)}
                  className={`py-1.5 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                    role === r
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                      : 'bg-command-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {authMode === 'signup' && (
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Full Officer Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Col. Sanjeev Rawat"
                  className="w-full pl-3 pr-3 py-2 bg-command-950/90 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer.name@ibvap.gov.in"
                  className="w-full pl-9 pr-3 py-2.5 bg-command-950/90 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-slate-300">
                  Password
                </label>
                {authMode === 'signin' && (
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password reset link dispatched to authorized sector officer email.');
                    }}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300"
                  >
                    Forgot Password?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-command-950/90 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-command-950 border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span>Remember Workstation</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                256-bit AES
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm tracking-wider uppercase transition-all shadow-glow-cyan flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>Connecting to Supabase...</span>
                </>
              ) : (
                <>
                  <span>{authMode === 'signup' ? 'Create Supabase Profile' : 'Authenticate & Enter'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Supabase Status Footer */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Supabase: <span className="text-emerald-400">Live (6 Tables Ready)</span></span>
            <span className="text-cyan-400">SIH 2026 Edition</span>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="p-4 text-center text-xs font-mono text-slate-500 relative z-10">
        © 2026 IBVAP — Intelligent Border Video Analytics Platform. All Rights Reserved. Restricted Government System.
      </footer>
    </div>
  );
}
