import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-[#5B7B10]/10 text-[#364E00] border-[#5B7B10]/20',
    success: 'bg-lime-100 text-lime-800 border-lime-300',
    warning: 'bg-amber-100 text-amber-800 border-amber-300',
    danger: 'bg-red-100 text-red-800 border-red-300',
    dark: 'bg-[#1C270A] text-white border-[#364E00]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs',
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}
