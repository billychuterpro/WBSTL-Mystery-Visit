/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FB_AREAS } from './data/mockData';
import { Visit, FBEvaluation, StaffInteraction } from './types/schema';
import { Header } from './components/Header';
import { KPIStatRow } from './components/KPIStatRow';
import { YTDScoreChart } from './components/YTDScoreChart';
import { StaffSpotlight } from './components/StaffSpotlight';
import { EvaluationDataGrid } from './components/EvaluationDataGrid';
import { EvaluationDetailModal } from './components/EvaluationDetailModal';
import { ReportIngestionModal } from './components/ReportIngestionModal';
import {
  subscribeVisits,
  subscribeEvaluations,
  subscribeStaffInteractions,
  saveVisitWithEvaluationsAndStaff,
  clearAllDatabaseRecords,
  resetDatabaseToProvidedReport,
  ensureDatabaseInitialized,
  testConnection,
} from './lib/firebase';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  RotateCcw,
  PlusCircle,
} from 'lucide-react';

export default function App() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [evaluations, setEvaluations] = useState<FBEvaluation[]>([]);
  const [staffInteractions, setStaffInteractions] = useState<StaffInteraction[]>([]);
  const [isFirebaseReady, setIsFirebaseReady] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'staff' | 'datagrid'>('dashboard');
  const [selectedEvaluation, setSelectedEvaluation] = useState<FBEvaluation | null>(null);
  const [selectedVisitCodeFilter, setSelectedVisitCodeFilter] = useState<string | null>(null);

  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initialise Firestore connection & real-time synchronization
  useEffect(() => {
    let unsubVisits: () => void = () => {};
    let unsubEvals: () => void = () => {};
    let unsubStaff: () => void = () => {};

    const initBackend = async () => {
      try {
        await testConnection();

        // Ensure database has baseline audit data if completely empty
        await ensureDatabaseInitialized();

        unsubVisits = subscribeVisits((list) => {
          setVisits(list);
          setIsFirebaseReady(true);
        });

        unsubEvals = subscribeEvaluations((list) => {
          setEvaluations(list);
        });

        unsubStaff = subscribeStaffInteractions((list) => {
          setStaffInteractions(list);
        });
      } catch (err) {
        console.error('Failed to initialize Firestore real-time synchronization', err);
        setIsFirebaseReady(true);
      }
    };

    initBackend();

    return () => {
      unsubVisits();
      unsubEvals();
      unsubStaff();
    };
  }, []);

  const handleCommitReport = async (
    newVisit: Visit,
    newEvals: FBEvaluation[],
    newStaff: StaffInteraction[]
  ) => {
    setIsSyncing(true);
    try {
      await saveVisitWithEvaluationsAndStaff(newVisit, newEvals, newStaff);
      triggerToast(`Audit for visit ${newVisit.visitCode} saved successfully.`);
    } catch (err) {
      console.error('Failed to save to Firestore', err);
      triggerToast('Error saving record to database. Please check connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('Are you sure you wish to clear all audit records from the database? The dashboard will be empty until you ingest reports.')) {
      setIsSyncing(true);
      try {
        await clearAllDatabaseRecords();
        setSelectedEvaluation(null);
        setSelectedVisitCodeFilter(null);
        triggerToast('All audit records cleared.');
      } catch (err) {
        console.error('Failed to clear database', err);
        triggerToast('Error clearing database records.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleResetToProvidedReport = async () => {
    setIsSyncing(true);
    try {
      await resetDatabaseToProvidedReport();
      setSelectedEvaluation(null);
      setSelectedVisitCodeFilter(null);
      triggerToast('Database restored with all 9 mystery shopper audits (Periods 4–9).');
    } catch (err) {
      console.error('Failed to reset database', err);
      triggerToast('Error resetting database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectVisitFromChart = (visitCode: string) => {
    setSelectedVisitCodeFilter(visitCode);
    setActiveTab('datagrid');
  };

  // Find visit and staff for selected evaluation modal
  const activeVisitForModal = selectedEvaluation
    ? visits.find((v) => v.id === selectedEvaluation.visitId)
    : undefined;

  const activeStaffForModal = selectedEvaluation
    ? staffInteractions.filter((s) => s.evaluationId === selectedEvaluation.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 text-xs animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar adhering to 3-Zone Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Contextual Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-lg p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider">
              <span>Warner Bros Studio Tour London</span>
              <span aria-hidden="true">·</span>
              <span>Catering Department Quality Audits</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Food & Beverage Mystery Shopper Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Monitoring year-to-date catering standards, Natasha's Law allergen safety compliance, and employee service narratives across Food Hall, Backlot, and Butterbeer.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              onClick={handleClearAllData}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-red-400 bg-red-950/40 border border-red-900/60 hover:bg-red-900/40 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Clear all records from database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Records</span>
            </button>
            <button
              onClick={handleResetToProvidedReport}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Restore all 9 official 2026 Storecheckers mystery shopper audits"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Restore Full 2026 Dataset</span>
            </button>
            <button
              onClick={() => setIsIngestModalOpen(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Ingest Shopper Report</span>
            </button>
          </div>
        </div>

        {/* Database status and summary */}
        {!isFirebaseReady ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <span>Loading audit records...</span>
          </div>
        ) : visits.length === 0 ? (
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Database is Empty</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                All records have been cleared. Ingest your mystery shopper report text or reload the provided 21/09/2026 report to begin tracking.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={handleResetToProvidedReport}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium cursor-pointer"
              >
                Load Provided 21/9/26 Report
              </button>
              <button
                onClick={() => setIsIngestModalOpen(true)}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded text-xs font-semibold cursor-pointer"
              >
                Paste / Ingest New Report
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center justify-between px-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-medium">
                Audits on record: <strong>{visits.length}</strong> ({visits.map((v) => v.visitCode).join(', ')})
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>UK Natasha's Law Food Safety Compliant</span>
            </div>
          </div>
        )}

        {/* Executive KPI Stat Row */}
        <KPIStatRow
          visits={visits}
          evaluations={evaluations}
        />

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Year-to-Date Line Chart */}
            <YTDScoreChart
              visits={visits}
              evaluations={evaluations}
              onSelectVisit={handleSelectVisitFromChart}
            />

            {/* Staff Spotlight Snippet */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    Recent Staff Recognitions & Shopper Praise
                  </h2>
                  <p className="text-xs text-slate-400">
                    Employees specifically commended in recent Storecheckers mystery shopper reports.
                  </p>
                </div>
                {staffInteractions.length > 3 && (
                  <button
                    onClick={() => setActiveTab('staff')}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <span>View All Commended Staff ({staffInteractions.length})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Show cards using shared StaffSpotlight component */}
              <StaffSpotlight
                staffInteractions={staffInteractions}
                visits={visits}
              />
            </div>
          </div>
        )}

        {/* TAB 2: STAFF SPOTLIGHT (Full View) */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <StaffSpotlight
              staffInteractions={staffInteractions}
              visits={visits}
            />
          </div>
        )}

        {/* TAB 3: DATA GRID & EVALUATION ARCHIVE */}
        {activeTab === 'datagrid' && (
          <EvaluationDataGrid
            evaluations={evaluations}
            visits={visits}
            staffInteractions={staffInteractions}
            onSelectEvaluation={(evaluation) => setSelectedEvaluation(evaluation)}
            selectedVisitCodeFilter={selectedVisitCodeFilter}
            onClearVisitFilter={() => setSelectedVisitCodeFilter(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Warner Bros Studio Tour London Catering Quality Assurance</span>
          <span>Storecheckers mystery shopper audit benchmark tracking</span>
        </div>
      </footer>

      {/* Evaluation Deep-Dive Detail Modal */}
      {selectedEvaluation && (
        <EvaluationDetailModal
          evaluation={selectedEvaluation}
          visit={activeVisitForModal}
          staff={activeStaffForModal}
          onClose={() => setSelectedEvaluation(null)}
        />
      )}

      {/* Mystery Shopper Report Ingestion Modal */}
      <ReportIngestionModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onCommitReport={handleCommitReport}
      />
    </div>
  );
}
