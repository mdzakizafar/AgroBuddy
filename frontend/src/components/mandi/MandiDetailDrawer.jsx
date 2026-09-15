import React, { useEffect } from 'react';
import { X, Building2, MapPin, AlertTriangle, TrendingUp, Coins, Truck, ShieldAlert } from 'lucide-react';
import { fetchMandiDetail, fetchMandiMarketState } from '../../api/mandis';
import { useQuery } from '@tanstack/react-query';
import { formatQtl, formatCurrency, formatPct, formatHours } from '../../lib/formatters';
import { Skeleton } from '../common/Skeleton';
import { Badge } from '../common/Badge';

export default function MandiDetailDrawer({ mandiId, onClose }) {
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['mandi-detail', mandiId],
    queryFn: () => fetchMandiDetail(mandiId),
    enabled: !!mandiId,
  });

  const { data: stateData, isLoading: isStateLoading } = useQuery({
    queryKey: ['mandi-market-state', mandiId],
    queryFn: () => fetchMandiMarketState(mandiId),
    enabled: !!mandiId,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!mandiId) return null;

  const isLoading = isDetailLoading || isStateLoading;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between p-4 sm:p-6 overflow-y-auto border-l border-[#5B7B10]/20 space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#5B7B10]/15 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#5B7B10] text-white flex items-center justify-center shadow-md shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-['Outfit'] font-bold text-base sm:text-lg text-[#1F2E0A] truncate">
                {detailData?.mandi?.mandi_name || mandiId}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#6B7C4B] flex items-center gap-1 font-medium truncate">
                <MapPin className="w-3 h-3 text-[#5B7B10] shrink-0" />
                <span className="truncate">{detailData?.mandi?.district}, {detailData?.mandi?.state} • {detailData?.mandi?.mandi_type}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#F4F6EC] hover:bg-[#E9EDDA] text-[#364E00] transition-colors cursor-pointer shrink-0"
            aria-label="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {/* Unified Market State Card */}
            <div className="agro-card p-3.5 sm:p-4 bg-gradient-to-br from-[#F6F8EF] to-[#E9EDDA] border-[#5B7B10]/25 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#364E00]">
                  UNIFIED MARKET STATE
                </span>
                <Badge variant={stateData?.overall_condition?.includes('High') ? 'danger' : 'success'}>
                  {stateData?.overall_condition}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-[#5B7B10]/15">
                  <p className="text-[10px] text-[#7A8F59] font-bold">Arrival</p>
                  <p className="font-bold text-[#1F2E0A] text-xs sm:text-sm">{stateData?.arrival_condition}</p>
                </div>
                <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-[#5B7B10]/15">
                  <p className="text-[10px] text-[#7A8F59] font-bold">Price</p>
                  <p className="font-bold text-[#1F2E0A] text-xs sm:text-sm">{stateData?.price_condition}</p>
                </div>
                <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-[#5B7B10]/15">
                  <p className="text-[10px] text-[#7A8F59] font-bold">Logistics</p>
                  <p className="font-bold text-[#1F2E0A] text-xs sm:text-sm">{stateData?.logistics_condition}</p>
                </div>
              </div>
            </div>

            {/* Arrival Summary */}
            <div className="agro-card p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#5B7B10]">
                <TrendingUp className="w-4 h-4" />
                <span>ARRIVAL ANALYTICS</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[#6B7C4B]">Total Arrivals:</p>
                  <p className="font-extrabold text-sm text-[#1F2E0A]">{formatQtl(detailData?.arrival_summary?.total_arrivals_qtl)}</p>
                </div>
                <div>
                  <p className="text-[#6B7C4B]">Farmers Served:</p>
                  <p className="font-extrabold text-sm text-[#1F2E0A]">{detailData?.arrival_summary?.total_farmers?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="agro-card p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D97706]">
                <Coins className="w-4 h-4" />
                <span>PRICE & MSP WATCH</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[#6B7C4B]">Avg Modal Price:</p>
                  <p className="font-extrabold text-sm text-[#1F2E0A]">{formatCurrency(detailData?.price_summary?.avg_modal_price)}</p>
                </div>
                <div>
                  <p className="text-[#6B7C4B]">Below MSP Rate:</p>
                  <p className="font-extrabold text-sm text-[#EF4444]">{formatPct(detailData?.price_summary?.below_msp_percentage)}</p>
                </div>
              </div>
            </div>

            {/* Logistics Summary */}
            <div className="agro-card p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB]">
                <Truck className="w-4 h-4" />
                <span>LOGISTICS OPERATIONS</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[#6B7C4B]">Delayed Trips:</p>
                  <p className="font-extrabold text-sm text-[#1F2E0A]">{formatPct(detailData?.logistics_summary?.delayed_trip_percentage)}</p>
                </div>
                <div>
                  <p className="text-[#6B7C4B]">Avg Transit Delay:</p>
                  <p className="font-extrabold text-sm text-[#1F2E0A]">{formatHours(detailData?.logistics_summary?.average_delay_hours)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full bg-[#5B7B10] hover:bg-[#364E00] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-md cursor-pointer mt-4"
        >
          Close Mandi Intelligence View
        </button>
      </div>
    </div>
  );
}
