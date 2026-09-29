/**
 * Date and time formatter for tactical display (ISO/IST/Military style)
 */
export function formatTacticalTime(dateInput) {
  if (!dateInput) return '--:--:--';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);
  
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatTacticalDate(dateInput) {
  if (!dateInput) return '----/--/--';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(dateInput) {
  if (!dateInput) return '--';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  return `${formatTacticalDate(date)} ${formatTacticalTime(date)}`;
}

export function formatRelativeTime(dateInput) {
  if (!dateInput) return 'just now';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 5) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export function formatSeverityColor(severity) {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return {
        bg: 'bg-red-500/15',
        border: 'border-red-500/40',
        text: 'text-red-400',
        badge: 'bg-red-500/20 text-red-300 border-red-500/50',
        glow: 'shadow-[0_0_12px_rgba(255,51,75,0.3)]',
        dot: 'bg-red-500'
      };
    case 'warning':
    case 'review':
    case 'medium':
      return {
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/40',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
        glow: 'shadow-[0_0_12px_rgba(255,179,0,0.3)]',
        dot: 'bg-amber-500'
      };
    case 'info':
    case 'low':
      return {
        bg: 'bg-cyan-500/15',
        border: 'border-cyan-500/40',
        text: 'text-cyan-400',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
        glow: 'shadow-[0_0_12px_rgba(0,229,255,0.3)]',
        dot: 'bg-cyan-500'
      };
    case 'friendly':
    case 'resolved':
    case 'online':
    case 'success':
      return {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
        glow: 'shadow-[0_0_12px_rgba(0,230,118,0.3)]',
        dot: 'bg-emerald-500'
      };
    default:
      return {
        bg: 'bg-slate-800/60',
        border: 'border-slate-700/50',
        text: 'text-slate-400',
        badge: 'bg-slate-800 text-slate-300 border-slate-700',
        glow: 'none',
        dot: 'bg-slate-500'
      };
  }
}
