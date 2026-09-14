import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';

// Pages
import CommandCenter from './pages/CommandCenter/CommandCenter';
import SupplyPulse from './pages/SupplyPulse/SupplyPulse';
import FarmerPriceWatch from './pages/FarmerPriceWatch/FarmerPriceWatch';
import LogisticsCommand from './pages/LogisticsCommand/LogisticsCommand';
import WeatherOperations from './pages/WeatherOperations/WeatherOperations';
import MandiRisk from './pages/MandiRisk/MandiRisk';
import ForecastPlanning from './pages/ForecastPlanning/ForecastPlanning';
import AskAgroBuddy from './pages/AskAgroBuddy/AskAgroBuddy';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PAGE_TITLES = {
  'command-center': 'Command Center',
  'supply': 'Supply Pulse',
  'prices': 'Farmer Price Watch',
  'logistics': 'Logistics Command',
  'weather': 'Weather & Operations',
  'risk': 'Mandi Risk Engine',
  'forecast': 'Forecast & Planning',
  'ask-agrobuddy': 'Ask AgroBuddy AI Workspace',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('command-center');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'command-center':
        return <CommandCenter />;
      case 'supply':
        return <SupplyPulse />;
      case 'prices':
        return <FarmerPriceWatch />;
      case 'logistics':
        return <LogisticsCommand />;
      case 'weather':
        return <WeatherOperations />;
      case 'risk':
        return <MandiRisk />;
      case 'forecast':
        return <ForecastPlanning />;
      case 'ask-agrobuddy':
        return <AskAgroBuddy />;
      default:
        return <CommandCenter />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pageTitle={PAGE_TITLES[activeTab]}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      >
        {renderPage()}
      </AppShell>
    </QueryClientProvider>
  );
}
