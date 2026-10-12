import React, { useState, useEffect, useMemo } from 'react';
import { Visit } from '../types/schema';
import { Calendar, X, Check, AlertCircle, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { sortVisits } from '../utils/sortUtils';

interface EditVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
  allVisits: Visit[];
  onSaveVisit: (updatedVisit: Visit, oldVisitId: string) => Promise<void>;
  onDeleteVisit?: (visitId: string) => Promise<void>;
}

// UK date display formatter (DD/MM/YYYY)
function formatUKDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export const EditVisitModal: React.FC<EditVisitModalProps> = ({
  isOpen,
  onClose,
  visit,
  allVisits,
  onSaveVisit,
  onDeleteVisit,
}) => {
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [visitCode, setVisitCode] = useState<string>('');
  const [visitDate, setVisitDate] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>('');
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [visitNumber, setVisitNumber] = useState<number>(1);
  const [periodYear, setPeriodYear] = useState<number>(2025);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sorted list of all visits by year, period (month), and visit number - executed unconditionally at top
  const sortedAllVisits = useMemo(() => {
    return sortVisits(allVisits || [], 'asc');
  }, [allVisits]);

  // Sync state whenever modal opens or active visit changes - executed unconditionally at top
  useEffect(() => {
    if (!isOpen) return;

    const target = visit || (allVisits && allVisits.length > 0 ? allVisits[0] : null);
    if (target) {
      setSelectedVisitId(target.id || '');
      setVisitCode(target.visitCode || 'P1-V1');
      setVisitDate(target.visitDate || '2025-01-10');
      setReportDate(target.reportDate || target.visitDate || '2025-01-10');
      setPeriodNumber(target.periodNumber || 1);
      setVisitNumber(target.visitNumber || 1);
      setPeriodYear(target.periodYear || 2025);
      setNotes(target.notes || '');
      setError(null);
      setIsConfirmingDelete(false);
    }
  }, [isOpen, visit, allVisits]);

  const currentSelectedVisit = sortedAllVisits.find((v) => v.id === selectedVisitId) || visit;

  // Handle selecting a different visit from the selector dropdown
  const handleSelectVisitChange = (newId: string) => {
    setSelectedVisitId(newId);
    const chosen = sortedAllVisits.find((v) => v.id === newId);
    if (chosen) {
      setVisitCode(chosen.visitCode);
      setVisitDate(chosen.visitDate);
      setReportDate(chosen.reportDate || chosen.visitDate);
      setPeriodNumber(chosen.periodNumber);
      setVisitNumber(chosen.visitNumber);
      setPeriodYear(chosen.periodYear);
      setNotes(chosen.notes || '');
      setError(null);
      setIsConfirmingDelete(false);
    }
  };

  // Delete current selected audit record with confirmation
  const handleConfirmDelete = async () => {
    if (!currentSelectedVisit || !onDeleteVisit) return;
    setIsDeleting(true);
    setError(null);

    try {
      await onDeleteVisit(currentSelectedVisit.id);
      setIsConfirmingDelete(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete audit record:', err);
      setError(err.message || 'An error occurred while deleting the audit record from the system.');
    } finally {
      setIsDeleting(false);
    }
  };

  // When Date of Visit changes, automatically suggest year, period and visit number
  const handleVisitDateChange = (newDateStr: string) => {
    setVisitDate(newDateStr);
    if (!newDateStr) return;

    const parts = newDateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);

      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const calculatedPeriod = m;
        const calculatedVisit = d >= 15 ? 2 : 1;
        setPeriodYear(y);
        setPeriodNumber(calculatedPeriod);
        setVisitNumber(calculatedVisit);
        setVisitCode(`P${calculatedPeriod}-V${calculatedVisit}`);
      }
    }
  };

  const handlePeriodChange = (p: number) => {
    const validPeriod = Math.max(1, Math.min(12, p || 1));
    setPeriodNumber(validPeriod);
    setVisitCode(`P${validPeriod}-V${visitNumber}`);
  };

  const handleVisitNumberChange = (v: number) => {
    const validV = Math.max(1, Math.min(4, v || 1));
    setVisitNumber(validV);
    setVisitCode(`P${periodNumber}-V${validV}`);
  };

  // Quick 1-click preset: Reallocate to P1-V1 (10/01/2025)
  const applyP1V1Preset = () => {
    setVisitCode('P1-V1');
    setVisitDate('2025-01-10');
    setReportDate('2025-01-10');
    setPeriodNumber(1);
    setVisitNumber(1);
    setPeriodYear(2025);
    setNotes('Mystery Shop Report: 10/01/2025 (Period 1, Visit 1).');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedVisit) {
      setError('Please select an audit record to edit.');
      return;
    }

    if (!visitCode.trim()) {
      setError('Visit code is required (e.g. P1-V1).');
      return;
    }

    if (!visitDate) {
      setError('Visit date is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const cleanVisitCode = visitCode.trim().toUpperCase();
      const newVisitId = `VISIT-${periodYear}-${cleanVisitCode}`;

      const updatedVisit: Visit = {
        ...currentSelectedVisit,
        id: newVisitId,
        visitCode: cleanVisitCode,
        visitDate,
        reportDate: reportDate || visitDate,
        periodNumber,
        visitNumber,
        periodYear,
        notes: notes.trim(),
      };

      await onSaveVisit(updatedVisit, currentSelectedVisit.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to update visit:', err);
      setError(err.message || 'An error occurred while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-visit-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="edit-visit-title" className="text-base font-bold text-white tracking-tight">
                Edit Audit & Visit Allocation
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Reallocate the audit date, calendar period, and visit number
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick preset banner for the 10/01/2025 report */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-amber-300">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Need to allocate to 10/01/2025?</span>
            </div>
            <button
              type="button"
              onClick={applyP1V1Preset}
              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded text-[11px] transition-colors cursor-pointer"
            >
              Set to P1-V1 (10/01/2025)
            </button>
          </div>

          {/* Target Audit Record Selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Select Audit Record to Edit / Reallocate
            </label>
            <select
              value={selectedVisitId}
              onChange={(e) => handleSelectVisitChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            >
              {sortedAllVisits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.visitCode} — {formatUKDateDisplay(v.visitDate)} ({v.surveyTitle || 'Mystery Shopper'})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Currently editing: <strong className="text-slate-300 font-mono">{currentSelectedVisit?.visitCode}</strong> ({formatUKDateDisplay(currentSelectedVisit?.visitDate)})
            </p>
          </div>

          {/* Core Visit Allocation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
            {/* Visit Date */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Date of Visit (UK)
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => handleVisitDateChange(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                UK format: {formatUKDateDisplay(visitDate)}
              </span>
            </div>

            {/* Visit Code */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Visit Code
              </label>
              <input
                type="text"
                value={visitCode}
                onChange={(e) => setVisitCode(e.target.value.toUpperCase())}
                placeholder="e.g. P1-V1"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Standard format: P[Period]-V[Visit] (e.g. P1-V1)
              </span>
            </div>

            {/* Period Number */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Period Number (1–12)
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={periodNumber}
                onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10))}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Month equivalent (1 = Jan, 4 = Apr, 9 = Sep)
              </span>
            </div>

            {/* Visit Number within Period */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Visit # in Period
              </label>
              <input
                type="number"
                min={1}
                max={4}
                value={visitNumber}
                onChange={(e) => handleVisitNumberChange(parseInt(e.target.value, 10))}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Visit 1 (early month) or Visit 2 (mid/late month)
              </span>
            </div>

            {/* Period Year */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Calendar Year
              </label>
              <input
                type="number"
                min={2020}
                max={2030}
                value={periodYear}
                onChange={(e) => setPeriodYear(parseInt(e.target.value, 10) || 2025)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Report Date */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Report Date (Survey Output)
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Audit Notes */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
              Audit Notes & Context
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Mystery Shop Report: 10/01/2025 (Period 1, Visit 1)."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          {/* Reallocation Summary Preview */}
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-200 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-blue-300">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cascading Reallocation Preview</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-300/90">
              Saving will reallocate this audit to <strong>{visitCode}</strong> dated <strong>{formatUKDateDisplay(visitDate)}</strong> (Period {periodNumber}, Visit {visitNumber}, Year {periodYear}). All associated Food Hall, Backlot, and Butterbeer catering scores, verbatim reviews, and staff records will be cleanly mapped to this new period.
            </p>
          </div>

          {/* Delete Record Confirmation Box */}
          {isConfirmingDelete && (
            <div className="p-4 bg-red-950/80 border border-red-500/50 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5 text-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">
                    Permanently delete audit record {currentSelectedVisit?.visitCode}?
                  </h4>
                  <p className="text-[11px] text-red-300/90 leading-relaxed">
                    This will permanently remove audit <strong>{currentSelectedVisit?.visitCode}</strong> ({formatUKDateDisplay(currentSelectedVisit?.visitDate)}), all 3 associated venue evaluations (Food Hall, Backlot, and Butterbeer), and any commended staff records from the system. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-red-900/60">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-900/30 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting Record...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Record</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            {onDeleteVisit && currentSelectedVisit ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isSaving || isDeleting || isConfirmingDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/40 border border-red-900/60 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                title="Delete this audit record and all associated evaluations from the system"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting || isConfirmingDelete}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Reallocate Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
