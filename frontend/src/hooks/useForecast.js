import { useQuery } from '@tanstack/react-query';
import { fetchForecastArrivals } from '../api/forecast';

export const useForecastArrivals = (filters = {}) => {
  return useQuery({
    queryKey: ['forecast-arrivals', filters],
    queryFn: () => fetchForecastArrivals(filters),
    staleTime: 60000,
  });
};
