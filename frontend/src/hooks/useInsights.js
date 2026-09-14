import { useQuery } from '@tanstack/react-query';
import { postInsight } from '../api/insights';

export const useInsights = (page, filters = {}) => {
  return useQuery({
    queryKey: ['insights', page, filters],
    queryFn: () => postInsight({ page, filters }),
    staleTime: 120000,
    retry: 1,
  });
};
