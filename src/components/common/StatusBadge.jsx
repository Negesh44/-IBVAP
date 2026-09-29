import React from 'react';
import { cn } from '../../utils/cn';

export default function StatusBadge({ status, className, pulse = false }) {
  const normalized = String(status || '').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'ONLINE':
      case 'ACTIVE':
      case 'FRIENDLY':
      case 'RESOLVED':
      case 'VERIFIED':
      case 'SUCCESS':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          dot: 'bg-emerald-400',
          pulseClass: 'pulse-cyan-badge'
        };
      case 'CRITICAL':
      case 'OFFLINE':
      case 'BREACH':
      case 'FAILED':
      case 'HIGH RISK':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/40',
          text: 'text-red-400',
          dot: 'bg-red-400',
          pulseClass: 'pulse-red-badge'
        };
      case 'WARNING':
      case 'IN_REVIEW':
      case 'REVIEW':
      case 'MAINTENANCE':
      case 'INVESTIGATING':
      case 'PENDING_ACTION':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          dot: 'bg-amber-400',
          pulseClass: ''
        };
      case 'INFO':
      case 'CLOSED':
      case 'ACKNOWLEDGED':
      default:
        return {
          bg: 'bg-slate-800/60',
          border: 'border-slate-700/60',
          text: 'text-slate-300',
          dot: 'bg-slate-400',
          pulseClass: ''
        };
    }
  };

  const style = getStyle();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border",
        style.bg,
        style.border,
        style.text,
        pulse && style.pulseClass,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot, (pulse || normalized === 'ONLINE' || normalized === 'CRITICAL') && "animate-ping")} />
      <span>{normalized.replace('_', ' ')}</span>
    </span>
  );
}
