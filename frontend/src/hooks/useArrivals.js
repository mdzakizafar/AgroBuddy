import { useQuery } from '@tanstack/react-query';
import { fetchArrivalTrend, fetchArrivalsByCrop, fetchArrivalsByMandi } from '../api/arrivals';

export const useArrivalTrend = (filters = {}) => {
  return useQuery({
    queryKey: ['arrivals-trend', filters],
    queryFn: () => fetchArrivalTrend(filters),
    staleTime: 60000,
  });
};

export const useArrivalsByCrop = (filters = {}) => {
  return useQuery({
    queryKey: ['arrivals-by-crop', filters],
    queryFn: () => fetchArrivalsByCrop(filters),
    staleTime: 60000,
  });
};

export const useArrivalsByMandi = (filters = {}) => {
  return useQuery({
    queryKey: ['arrivals-by-mandi', filters],
    queryFn: () => fetchArrivalsByMandi(filters),
    staleTime: 60000,
  });
};
