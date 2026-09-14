import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '../api/overview';

export const useOverview = (filters = {}) => {
  return useQuery({
    queryKey: ['overview', filters],
    queryFn: () => fetchOverview(filters),
    staleTime: 60000,
    keepPreviousData: true,
  });
};
