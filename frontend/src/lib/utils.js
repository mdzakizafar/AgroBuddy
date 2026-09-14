import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getRiskColorClass(level) {
  switch (String(level).toLowerCase()) {
    case 'high':
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
    case 'warning':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'low':
    case 'healthy':
    default:
      return 'bg-lime-100 text-lime-800 border-lime-200';
  }
}

export function getSeverityBadge(severity) {
  switch (String(severity).toLowerCase()) {
    case 'high':
      return { bg: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'High Priority' };
    case 'medium':
      return { bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Medium Concern' };
    default:
      return { bg: 'bg-lime-500/10 text-lime-700 border-lime-500/20', label: 'Low Severity' };
  }
}
