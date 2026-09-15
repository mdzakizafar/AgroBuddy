import { useQuery } from '@tanstack/react-query';
import { fetchPricesMSP, fetchPricePressure, fetchPricesKPIs, fetchPriceDirectory } from '../api/prices';

export const usePricesKPIs = (filters = {}) => {
  return useQuery({
    queryKey: ['prices-kpis', filters],
    queryFn: () => fetchPricesKPIs(filters),
    staleTime: 60000,
  });
};

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

export const usePriceDirectory = (filters = {}) => {
  return useQuery({
    queryKey: ['price-directory', filters],
    queryFn: () => fetchPriceDirectory(filters),
    staleTime: 60000,
  });
};
