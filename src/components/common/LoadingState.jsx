import React from 'react';
import { Loader2, Radio } from 'lucide-react';
import { cn } from '../../utils/cn';

export function LoadingState({ message = "Synchronizing Tactical Feed...", className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      <div className="relative mb-4">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <Radio className="w-4 h-4 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <p className="text-xs font-mono text-cyan-300 tracking-wider uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search records, IDs, sectors...", className }) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <svg
        className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 bg-command-950/80 border border-slate-700/70 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 text-xs text-slate-500 hover:text-slate-300"
        >
          ✕
        </button>
      )}
    </div>
  );
}
