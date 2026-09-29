import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'up',
  colorScheme = 'cyan', // cyan | red | green | amber | blue | purple
  onClick,
  className
}) {
  const colorMap = {
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/50',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      glow: 'hover:shadow-[0_0_20px_-5px_rgba(0,229,255,0.25)]',
      valColor: 'text-cyan-300'
    },
    red: {
      border: 'border-red-500/30 hover:border-red-500/60',
      iconBg: 'bg-red-500/10 text-red-400 border-red-500/40',
      glow: 'hover:shadow-[0_0_20px_-5px_rgba(255,51,75,0.3)]',
      valColor: 'text-red-400'
    },
    green: {
      border: 'border-emerald-500/20 hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      glow: 'hover:shadow-[0_0_20px_-5px_rgba(0,230,118,0.25)]',
      valColor: 'text-emerald-400'
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/50',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      glow: 'hover:shadow-[0_0_20px_-5px_rgba(255,179,0,0.25)]',
      valColor: 'text-amber-300'
    },
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/50',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      glow: 'hover:shadow-[0_0_20px_-5px_rgba(0,176,255,0.25)]',
      valColor: 'text-blue-300'
    },
  };

  const currentTheme = colorMap[colorScheme] || colorMap.cyan;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl bg-command-900/80 p-5 backdrop-blur-md border transition-all duration-200",
        currentTheme.border,
        currentTheme.glow,
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Subtle tactical corner accent */}
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none opacity-40">
        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-slate-500 rounded-full" />
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-2xl lg:text-3xl font-bold tracking-tight font-mono", currentTheme.valColor)}>
              {value}
            </span>
            {trend && (
              <span className={cn(
                "text-xs font-semibold font-mono",
                trendDirection === 'up' ? 'text-emerald-400' : 'text-red-400'
              )}>
                {trendDirection === 'up' ? '↑' : '↓'} {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={cn("p-2.5 rounded-lg border", currentTheme.iconBg)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
