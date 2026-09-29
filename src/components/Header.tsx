import React from 'react';
import { PlusCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'trends' | 'staff' | 'datagrid';
  setActiveTab: (tab: 'dashboard' | 'trends' | 'staff' | 'datagrid') => void;
  onOpenIngestModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenIngestModal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm tracking-wider">
            WB
          </div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="text-left group cursor-pointer focus-visible:outline-none"
          >
            <span className="text-base font-semibold tracking-tight text-white group-hover:text-amber-400 transition-colors">
              F&B Mystery Shopper Performance Hub
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-2 font-normal">
              Catering Audit Analytics
            </span>
          </button>
        </div>

        {/* Zone 2: Clean operational navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors cursor-pointer py-1 ${
              activeTab === 'dashboard'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`transition-colors cursor-pointer py-1 ${
              activeTab === 'trends'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            YTD Score Trends
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`transition-colors cursor-pointer py-1 ${
              activeTab === 'staff'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Staff Spotlight
          </button>
          <button
            onClick={() => setActiveTab('datagrid')}
            className={`transition-colors cursor-pointer py-1 ${
              activeTab === 'datagrid'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Evaluation Records
          </button>
        </nav>

        {/* Zone 3: Primary actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenIngestModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
            <span>Ingest Shopper Report</span>
          </button>
        </div>
      </div>
    </header>
  );
};
