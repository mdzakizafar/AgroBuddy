import { useQuery } from '@tanstack/react-query';
import { fetchLogisticsSummary, fetchLogisticsDelays, fetchLogisticsByMandi } from '../api/logistics';

export const useLogisticsSummary = (filters = {}) => {
  return useQuery({
    queryKey: ['logistics-summary', filters],
    queryFn: () => fetchLogisticsSummary(filters),
    staleTime: 60000,
  });
};

export const useLogisticsDelays = (filters = {}) => {
  return useQuery({
    queryKey: ['logistics-delays', filters],
    queryFn: () => fetchLogisticsDelays(filters),
    staleTime: 60000,
  });
};

export const useLogisticsByMandi = (filters = {}) => {
  return useQuery({
    queryKey: ['logistics-by-mandi', filters],
    queryFn: () => fetchLogisticsByMandi(filters),
    staleTime: 60000,
  });
};
