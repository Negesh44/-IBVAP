import React from 'react';
import { ShieldCheck, Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function EmptyState({
  icon: Icon = Inbox,
  title = "No Data Available",
  description = "There are no records matching your current filter criteria.",
  action,
  className
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-800 bg-command-900/40", className)}>
      <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
