import React, { useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({ columns, data, pageSize = 8, onRowClick }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  if (!data || data.length === 0) {
    return (
      <div className="p-6 sm:p-8 text-center text-xs font-semibold text-[#7A8F59] bg-[#F4F6EC]/50 rounded-xl border border-dashed border-[#5B7B10]/20">
        No records available under current filter selection.
      </div>
    );
  }

  const handleSort = (colKey) => {
    if (sortColumn === colKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    const valA = a[sortColumn];
    const valB = b[sortColumn];
    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;
    const res = valA < valB ? -1 : 1;
    return sortDirection === 'asc' ? res : -res;
  });

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-3 w-full">
      <div className="overflow-x-auto rounded-xl border border-[#5B7B10]/15 w-full">
        <table className="w-full text-left text-xs min-w-[540px] sm:min-w-full">
          <thead className="bg-[#F4F6EC] text-[#364E00] font-bold uppercase tracking-wider border-b border-[#5B7B10]/15">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-3 py-2.5 sm:p-3.5 select-none whitespace-nowrap ${col.sortable !== false ? 'cursor-pointer hover:bg-[#E9EDDA]' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable !== false && <ArrowUpDown className="w-3 h-3 opacity-60 shrink-0" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#5B7B10]/10 bg-white">
            {paginatedData.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-[#F6F8EF]' : 'hover:bg-gray-50'
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5 sm:p-3.5 text-[#1F2E0A] font-medium whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6B7C4B] px-1">
          <span className="text-[11px] sm:text-xs">
            Showing {startIndex + 1}–{Math.min(startIndex + pageSize, data.length)} of {data.length} records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-[#F4F6EC] hover:bg-[#E9EDDA] disabled:opacity-40 transition-colors cursor-pointer"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-[#1F2E0A] text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-[#F4F6EC] hover:bg-[#E9EDDA] disabled:opacity-40 transition-colors cursor-pointer"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
