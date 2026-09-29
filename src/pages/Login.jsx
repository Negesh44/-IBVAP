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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState('sanjeev.rawat@ibvap.gov.in');
  const [password, setPassword] = useState('••••••••••••');
  const [role, setRole] = useState('ADMIN');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [demoNotice, setDemoNotice] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const result = await login(email, password, role);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(result.error || 'Invalid credentials or security token.');
    }
  };

  const handleQuickRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    const roleEmails = {
      ADMIN: 'sanjeev.rawat@ibvap.gov.in',
      COMMANDER: 'rajesh.sharma@ibvap.gov.in',
      OPERATOR: 'priya.verma@ibvap.gov.in',
      VIEWER: 'amit.deshmukh@ibvap.gov.in'
    };
    setEmail(roleEmails[selectedRole] || 'operator@ibvap.gov.in');
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
          <span>SECURITY PROTOCOL LEVEL 5</span>
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
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 shadow-glow-cyan">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              IBVAP COMMAND PORTAL
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Intelligent Border Video Analytics Platform
            </p>
          </div>

          {/* Role Quick Selector for Presentation */}
          <div className="mb-5">
            <label className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Official Government Email / ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer.name@ibvap.gov.in"
                  className="w-full pl-9 pr-3 py-2.5 bg-command-950/90 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-slate-300">
                  Password / CAC PIN
                </label>
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
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-command-950/90 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
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
                256-bit Encrypted
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm tracking-wider uppercase transition-all shadow-glow-cyan flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Supabase Ready Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Auth Engine: {isSupabaseConfigured ? 'Supabase Active' : 'Tactical Mock Mode'}</span>
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
