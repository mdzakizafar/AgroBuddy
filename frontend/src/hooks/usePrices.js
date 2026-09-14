import { useQuery } from '@tanstack/react-query';
import { fetchPricesMSP, fetchPricePressure } from '../api/prices';

export const usePricesMSP = (filters = {}) => {
  return useQuery({
    queryKey: ['prices-msp', filters],
    queryFn: () => fetchPricesMSP(filters),
    staleTime: 60000,
  });
};

export const usePricePressure = (filters = {}) => {
  return useQuery({
    queryKey: ['price-pressure', filters],
    queryFn: () => fetchPricePressure(filters),
    staleTime: 60000,
  });
};
