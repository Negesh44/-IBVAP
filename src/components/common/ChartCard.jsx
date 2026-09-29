import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function ChartCard({
  title,
  subtitle,
  children,
  action,
  className
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border border-slate-800 bg-command-900/70 p-5 backdrop-blur-md",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
        <div>
          <h4 className="font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-cyan-400 rounded-sm inline-block" />
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="w-full">{children}</div>
    </motion.div>
  );
}
