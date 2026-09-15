/**
 * AgroBuddy Centralized Formatters
 * Properly handles positive and negative numbers without double minus,
 * trailing zeroes, or misformatted currency/percent symbols.
 */

export const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const formatted = Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return num < 0 ? `-₹${formatted}` : `₹${formatted}`;
};

export const formatShortfall = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  return `-₹${Math.abs(num).toFixed(1)}/Qtl`;
};

export const formatQtl = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (absNum >= 1000) {
    return `${sign}${(absNum / 1000).toFixed(2)}k Qtl`;
  }
  return `${sign}${absNum.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Qtl`;
};

export const formatPct = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  return `${num.toFixed(1)}%`;
};

export const formatHours = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  return `${num.toFixed(1)} hrs`;
};

export const formatKm = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  return `${Math.round(num)} km`;
};

export const formatTemp = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  return `${num.toFixed(1)}°C`;
};

export const formatRain = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (absNum >= 1000) {
    return `${sign}${(absNum / 1000).toFixed(1)}k mm`;
  }
  return `${sign}${absNum.toFixed(1)} mm`;
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
