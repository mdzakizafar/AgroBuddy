import React, { useState } from 'react';
import { Filter, Calendar, Sprout, Building2, MapPin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';

export default function FilterBar({ filters, onFilterChange, onReset, showCrop = true, showMandi = true, showDistrict = true }) {
  const { data: filterOptions, isLoading } = useFilters();
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const handleChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const crops = filterOptions?.crops || ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Mustard'];
  const mandis = filterOptions?.mandis || [];
  const districts = filterOptions?.districts || [];

  const activeFilterCount = Object.values(filters).filter((val) => Boolean(val)).length;
  const hasActiveFilters = activeFilterCount > 0;

  const maxDate = filterOptions?.max_date || '2026-09-09';
  const minDate = filterOptions?.min_date || '2026-01-01';

  return (
    <div className="agro-card p-3 sm:p-4 bg-white/90 backdrop-blur-md border border-[#5B7B10]/15">
      {/* Mobile Top Header (Toggle & Clear) */}
      <div className="flex sm:hidden items-center justify-between">
        <button
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="flex items-center gap-2 text-xs font-bold text-[#364E00] py-1 px-2 rounded-lg bg-[#F4F6EC] border border-[#5B7B10]/15 cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5 text-[#5B7B10]" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-[#5B7B10] text-white text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
          {isMobileExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#6B7C4B]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#6B7C4B]" />}
        </button>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-bold text-[#EF4444] bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Main Filter Tray (Always visible on sm+, expandable on mobile) */}
      <div
        className={`${
          isMobileExpanded ? 'flex flex-col' : 'hidden'
        } sm:flex sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 mt-3 sm:mt-0`}
      >
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#364E00] shrink-0">
          <Filter className="w-4 h-4 text-[#5B7B10]" />
          <span>Filters:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
          {/* Date Range From */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#5B7B10] shrink-0" />
              <span className="text-[#6B7C4B] font-medium">From:</span>
            </div>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={filters.date_from || ''}
              onChange={(e) => handleChange('date_from', e.target.value)}
              className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer text-xs"
            />
          </div>

          {/* Date Range To */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#5B7B10] shrink-0" />
              <span className="text-[#6B7C4B] font-medium">To:</span>
            </div>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={filters.date_to || ''}
              onChange={(e) => handleChange('date_to', e.target.value)}
              className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer text-xs"
            />
          </div>

          {/* Crop Filter */}
          {showCrop && (
            <div className="flex items-center gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs w-full sm:w-auto">
              <Sprout className="w-3.5 h-3.5 text-[#5B7B10] shrink-0" />
              <select
                value={filters.crop || ''}
                onChange={(e) => handleChange('crop', e.target.value)}
                className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer w-full text-xs"
              >
                <option value="">All Crops</option>
                {crops.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Mandi Filter */}
          {showMandi && (
            <div className="flex items-center gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs w-full sm:w-auto">
              <Building2 className="w-3.5 h-3.5 text-[#5B7B10] shrink-0" />
              <select
                value={filters.mandi_id || ''}
                onChange={(e) => handleChange('mandi_id', e.target.value)}
                className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer w-full sm:max-w-[160px] text-xs"
              >
                <option value="">All Mandis</option>
                {mandis.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* District Filter */}
          {showDistrict && (
            <div className="flex items-center gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs w-full sm:w-auto">
              <MapPin className="w-3.5 h-3.5 text-[#5B7B10] shrink-0" />
              <select
                value={filters.district || ''}
                onChange={(e) => handleChange('district', e.target.value)}
                className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer w-full text-xs"
              >
                <option value="">All Districts</option>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Clear Filters Button (Desktop) */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-[#EF4444] bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
