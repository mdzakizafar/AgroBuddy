import { useQuery } from '@tanstack/react-query';
import { fetchRiskMandis, fetchRiskMandiDetail } from '../api/risk';

export const useRiskMandis = (filters = {}) => {
  return useQuery({
    queryKey: ['risk-mandis', filters],
    queryFn: () => fetchRiskMandis(filters),
    staleTime: 60000,
  });
};

export const useRiskMandiDetail = (mandiId) => {
  return useQuery({
    queryKey: ['risk-mandi-detail', mandiId],
    queryFn: () => fetchRiskMandiDetail(mandiId),
    enabled: !!mandiId,
  });
};
