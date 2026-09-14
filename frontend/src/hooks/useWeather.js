import { useQuery } from '@tanstack/react-query';
import { fetchWeatherTrend, fetchWeatherExtremes, fetchWeatherSensors } from '../api/weather';

export const useWeatherTrend = (filters = {}) => {
  return useQuery({
    queryKey: ['weather-trend', filters],
    queryFn: () => fetchWeatherTrend(filters),
    staleTime: 60000,
  });
};

export const useWeatherExtremes = (filters = {}) => {
  return useQuery({
    queryKey: ['weather-extremes', filters],
    queryFn: () => fetchWeatherExtremes(filters),
    staleTime: 60000,
  });
};

export const useWeatherSensors = () => {
  return useQuery({
    queryKey: ['weather-sensors'],
    queryFn: fetchWeatherSensors,
    staleTime: 60000,
  });
};
