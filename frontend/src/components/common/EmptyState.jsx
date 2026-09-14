import React from 'react';
import { AlertTriangle, Database, RotateCw } from 'lucide-react';

export function EmptyState({ message = 'No analytics data available for the selected filters.' }) {
  return (
    <div className="agro-card p-8 text-center flex flex-col items-center justify-center space-y-3 bg-[#F4F6EC]/40 border-dashed">
      <div className="w-12 h-12 rounded-full bg-[#5B7B10]/10 text-[#5B7B10] flex items-center justify-center">
        <Database className="w-6 h-6" />
      </div>
      <p className="text-xs font-semibold text-[#6B7C4B] max-w-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Unable to load analytics data.', onRetry }) {
  return (
    <div className="agro-card p-8 text-center flex flex-col items-center justify-center space-y-3 bg-red-50/50 border-red-200">
      <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <p className="text-xs font-bold text-red-800">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#5B7B10] hover:bg-[#364E00] px-4 py-2 rounded-xl transition-all shadow-md"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
}
