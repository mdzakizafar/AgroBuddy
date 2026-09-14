import React from 'react';
import { Filter, Calendar, Sprout, Building2, MapPin, X } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';

export default function FilterBar({ filters, onFilterChange, onReset, showCrop = true, showMandi = true, showDistrict = true }) {
  const { data: filterOptions, isLoading } = useFilters();

  const handleChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const crops = filterOptions?.crops || ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Mustard'];
  const mandis = filterOptions?.mandis || [];
  const districts = filterOptions?.districts || [];

  const hasActiveFilters = Object.values(filters).some((val) => Boolean(val));

  return (
    <div className="agro-card p-4 bg-white/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 border border-[#5B7B10]/15">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#364E00]">
        <Filter className="w-4 h-4 text-[#5B7B10]" />
        <span>Filters:</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 flex-1">
        {/* Date Range From */}
        <div className="flex items-center gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#5B7B10]" />
          <span className="text-[#6B7C4B] font-medium">From:</span>
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => handleChange('date_from', e.target.value)}
            className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer"
          />
        </div>

        {/* Date Range To */}
        <div className="flex items-center gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#5B7B10]" />
          <span className="text-[#6B7C4B] font-medium">To:</span>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => handleChange('date_to', e.target.value)}
            className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer"
          />
        </div>

        {/* Crop Filter */}
        {showCrop && (
          <div className="flex items-center gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs">
            <Sprout className="w-3.5 h-3.5 text-[#5B7B10]" />
            <select
              value={filters.crop || ''}
              onChange={(e) => handleChange('crop', e.target.value)}
              className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer"
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
          <div className="flex items-center gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#5B7B10]" />
            <select
              value={filters.mandi_id || ''}
              onChange={(e) => handleChange('mandi_id', e.target.value)}
              className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer max-w-[160px]"
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
          <div className="flex items-center gap-1.5 bg-[#F4F6EC] px-3 py-1.5 rounded-xl border border-[#5B7B10]/15 text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#5B7B10]" />
            <select
              value={filters.district || ''}
              onChange={(e) => handleChange('district', e.target.value)}
              className="bg-transparent text-[#1F2E0A] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs font-bold text-[#EF4444] bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
