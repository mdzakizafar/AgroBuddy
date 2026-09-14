import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ activeTab, onTabChange, pageTitle, onRefresh, isRefreshing, children }) {
  return (
    <div className="flex min-h-screen bg-[#F6F8EF] text-[#1F2E0A]">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header pageTitle={pageTitle} onRefresh={onRefresh} isRefreshing={isRefreshing} />

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
