/**
 * AgroBuddy Centralized Formatters
 */

export const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const formatQtl = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}k Qtl`;
  }
  return `${num.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Qtl`;
};

export const formatPct = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${Number(val).toFixed(1)}%`;
};

export const formatHours = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${Number(val).toFixed(1)} hrs`;
};

export const formatKm = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${Math.round(Number(val))} km`;
};

export const formatTemp = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${Number(val).toFixed(1)}°C`;
};

export const formatRain = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${Number(val).toFixed(1)} mm`;
};

export const formatDateStr = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};
