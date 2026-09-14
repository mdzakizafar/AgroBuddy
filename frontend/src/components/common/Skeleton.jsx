import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-[#5B7B10]/10 rounded-lg ${className}`} />
  );
}

export function KpiSkeleton() {
  return (
    <div className="agro-card p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function ChartSkeleton({ height = 'h-64' }) {
  return (
    <div className={`agro-card p-5 flex items-end gap-3 ${height}`}>
      <Skeleton className="h-3/4 w-full" />
      <Skeleton className="h-1/2 w-full" />
      <Skeleton className="h-5/6 w-full" />
      <Skeleton className="h-2/3 w-full" />
    </div>
  );
}
