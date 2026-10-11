import React, { useState, useMemo } from 'react';
import { Visit, FBEvaluation } from '../types/schema';
import { Calendar, Target, Info, CheckCircle2, Clock } from 'lucide-react';
import { extractPeriodAndVisitNumber } from '../utils/sortUtils';

interface QuarterlyScoreBoxesProps {
  visits: Visit[];
  evaluations: FBEvaluation[];
}

interface QuarterConfig {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  name: string;
  monthsLabel: string;
  months: number[]; // 0-indexed month numbers: [0, 1, 2] for Jan-Mar
  periods: number[]; // Period numbers: [1, 2, 3] for Q1
}

const QUARTERS: QuarterConfig[] = [
  { id: 'Q1', name: 'Q1', monthsLabel: 'Jan–Mar', months: [0, 1, 2], periods: [1, 2, 3] },
  { id: 'Q2', name: 'Q2', monthsLabel: 'Apr–Jun', months: [3, 4, 5], periods: [4, 5, 6] },
  { id: 'Q3', name: 'Q3', monthsLabel: 'Jul–Sep', months: [6, 7, 8], periods: [7, 8, 9] },
  { id: 'Q4', name: 'Q4', monthsLabel: 'Oct–Dec', months: [9, 10, 11], periods: [10, 11, 12] },
];

const TARGET_BENCHMARK = 95.0;
const STANDARD_QUARTER_AUDITS = 6; // Standard mystery shopping quota: 2 visits per period * 3 periods

export const QuarterlyScoreBoxes: React.FC<QuarterlyScoreBoxesProps> = ({
  visits,
  evaluations,
}) => {
  // Extract all available years from the visits dataset
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    visits.forEach((v) => {
      const meta = extractPeriodAndVisitNumber(v);
      if (meta.year) yearsSet.add(meta.year);
    });
    const arr = Array.from(yearsSet).sort((a, b) => b - a);
    return arr.length > 0 ? arr : [2026];
  }, [visits]);

  // Determine current primary year
  const primaryYear = availableYears[0] || new Date().getFullYear();

  // Selected year filter: 'all' or a specific calendar year
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(primaryYear);

  // Sync selectedYear if availableYears changes and current selection is no longer valid
  React.useEffect(() => {
    if (selectedYear !== 'all' && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] || 'all');
    }
  }, [availableYears, selectedYear]);

  /**
   * Calculates quarter performance statistics.
   * Ensures averages are displayed even if only partial visits for the quarter have been logged (e.g. 2 visits).
   */
  const calculateQuarterStats = (quarter: QuarterConfig, filterYear: number | 'all') => {
    // 1. Filter visits belonging to this quarter
    let quarterVisits = visits.filter((v) => {
      const meta = extractPeriodAndVisitNumber(v);
      const { month } = parseVisitMonth(v.visitDate);

      // Match by month or period number
      const matchesQuarter =
        quarter.periods.includes(meta.period) || quarter.months.includes(month);
      if (!matchesQuarter) return false;

      // Match by year
      if (filterYear === 'all') return true;
      return meta.year === filterYear;
    });

    let isCrossYearCycle = false;

    // 2. Intelligent fallback: If specific calendar year has no audits for this quarter,
    // but audits exist in the active programme dataset (e.g. Q1 P1 visits logged in the cycle),
    // include those visits so the user's logged data is never omitted.
    if (quarterVisits.length === 0 && filterYear !== 'all') {
      const cycleVisits = visits.filter((v) => {
        const meta = extractPeriodAndVisitNumber(v);
        const { month } = parseVisitMonth(v.visitDate);
        return quarter.periods.includes(meta.period) || quarter.months.includes(month);
      });

      if (cycleVisits.length > 0) {
        quarterVisits = cycleVisits;
        isCrossYearCycle = true;
      }
    }

    if (quarterVisits.length === 0) {
      return {
        score: null,
        actualPts: 0,
        possiblePts: 0,
        auditCount: 0,
        isPartial: false,
        isCrossYearCycle: false,
      };
    }

    // 3. Match individual section evaluations
    const quarterVisitIds = new Set(quarterVisits.map((v) => v.id));
    const quarterEvals = evaluations.filter((e) => quarterVisitIds.has(e.visitId));

    const totalAct = quarterEvals.reduce((sum, e) => sum + e.actualScore, 0);
    const totalPos = quarterEvals.reduce((sum, e) => sum + e.possibleScore, 0);

    if (totalPos > 0) {
      const pct = (totalAct / totalPos) * 100;
      return {
        score: Math.round(pct * 10) / 10,
        actualPts: totalAct,
        possiblePts: totalPos,
        auditCount: quarterVisits.length,
        isPartial: quarterVisits.length < STANDARD_QUARTER_AUDITS,
        isCrossYearCycle,
      };
    }

    // Fallback: If evaluation breakdown items are not found, average visit-level catering percentage
    const validVisits = quarterVisits.filter(
      (v) =>
        typeof v.cateringOverallPercentage === 'number' ||
        typeof v.overallPercentage === 'number'
    );

    if (validVisits.length > 0) {
      const sum = validVisits.reduce(
        (acc, v) => acc + (v.cateringOverallPercentage ?? v.overallPercentage ?? 0),
        0
      );
      const avg = sum / validVisits.length;
      return {
        score: Math.round(avg * 10) / 10,
        actualPts: 0,
        possiblePts: 0,
        auditCount: quarterVisits.length,
        isPartial: quarterVisits.length < STANDARD_QUARTER_AUDITS,
        isCrossYearCycle,
      };
    }

    return {
      score: null,
      actualPts: 0,
      possiblePts: 0,
      auditCount: quarterVisits.length,
      isPartial: quarterVisits.length < STANDARD_QUARTER_AUDITS,
      isCrossYearCycle,
    };
  };

  return (
    <div className="space-y-3">
      {/* Section Sub-heading & Year Filter Controls */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold tracking-wide uppercase text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Quarterly Catering Performance</span>
          </div>

          {/* Year Switcher Pills */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 ml-2">
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                selectedYear === 'all'
                  ? 'bg-amber-400 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show performance across the complete audit programme cycle"
            >
              All Periods
            </button>
          </div>
        </div>

        {/* Target Benchmark badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Target className="w-3 h-3 text-emerald-400" />
          <span>
            Target Benchmark: <strong className="text-slate-300 font-mono">95.0%</strong>
          </span>
        </div>
      </div>

      {/* 4 Permanent Metric Boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {QUARTERS.map((q) => {
          const currentStats = calculateQuarterStats(q, selectedYear);
          const previousYear = typeof selectedYear === 'number' ? selectedYear - 1 : primaryYear - 1;
          const previousStats = calculateQuarterStats(q, previousYear);

          // RAG Conditional Formatting
          const hasData = currentStats.score !== null;
          const isAtOrAboveTarget = hasData && currentStats.score! >= TARGET_BENCHMARK;

          const scoreColorClass = !hasData
            ? 'text-slate-500'
            : isAtOrAboveTarget
            ? 'text-emerald-400'
            : 'text-rose-400';

          const badgeBgClass = !hasData
            ? 'bg-slate-800/40 text-slate-400 border-slate-700/50'
            : isAtOrAboveTarget
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
            : 'bg-rose-950/40 text-rose-300 border-rose-800/50';

          // Variance against Benchmark or Last Year (LY)
          let varianceText = '— vs benchmark';
          let varianceColorClass = 'text-slate-500';

          if (hasData) {
            if (previousStats.score !== null) {
              const yoyVariance = Math.round((currentStats.score! - previousStats.score) * 10) / 10;
              const sign = yoyVariance > 0 ? '+' : '';
              varianceText = `${sign}${yoyVariance.toFixed(1)}% vs LY`;
              varianceColorClass = yoyVariance >= 0 ? 'text-emerald-400' : 'text-rose-400';
            } else {
              const delta = Math.round((currentStats.score! - TARGET_BENCHMARK) * 10) / 10;
              const sign = delta > 0 ? '+' : '';
              varianceText = `${sign}${delta.toFixed(1)}% vs target`;
              varianceColorClass = delta >= 0 ? 'text-emerald-400' : 'text-rose-400';
            }
          }

          return (
            <div
              key={q.id}
              className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between transition-all hover:border-slate-700 relative overflow-hidden"
            >
              {/* Top Row: Quarter Title, Months label & RAG Badge */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white tracking-wide text-xs">{q.name}</span>
                  <span className="text-[11px] text-slate-400">({q.monthsLabel})</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${badgeBgClass}`}
                >
                  {!hasData ? 'No Audits' : isAtOrAboveTarget ? 'On Target' : 'Below Target'}
                </span>
              </div>

              {/* Main Score Value (Always displayed if 1 or more audits exist) */}
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={`text-3xl font-bold font-mono tracking-tight tabular-nums ${scoreColorClass}`}
                >
                  {hasData ? `${currentStats.score!.toFixed(1)}%` : 'N/A'}
                </span>
                {hasData && currentStats.possiblePts > 0 && (
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    ({currentStats.actualPts}/{currentStats.possiblePts} pts)
                  </span>
                )}
              </div>

              {/* Audit Count & Progress Indicator */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className={`font-mono text-[11px] tabular-nums font-medium ${varianceColorClass}`}>
                  {varianceText}
                </span>

                {hasData ? (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    {currentStats.isPartial ? (
                      <span
                        className="inline-flex items-center gap-1 text-amber-300/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                        title={`In-progress quarter: ${currentStats.auditCount} visits recorded to date`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>{currentStats.auditCount} {currentStats.auditCount === 1 ? 'audit' : 'audits'} (in progress)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{currentStats.auditCount} audits</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">0 audits logged</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reassuring In-Progress Quarter Note */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
        <Info className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
        <span>
          Quarter averages are calculated continuously from all recorded visits to date, displaying running performance even before all visits for a quarter are completed.
        </span>
      </div>
    </div>
  );
};

// Helper to extract 0-indexed month from date string
function parseVisitMonth(dateStr?: string): { year: number; month: number } {
  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(m)) {
        return { year: !isNaN(y) ? y : 2026, month: m };
      }
    }
  }
  const d = dateStr ? new Date(dateStr) : new Date();
  return {
    year: !isNaN(d.getFullYear()) ? d.getFullYear() : 2026,
    month: !isNaN(d.getMonth()) ? d.getMonth() : 0,
  };
}
