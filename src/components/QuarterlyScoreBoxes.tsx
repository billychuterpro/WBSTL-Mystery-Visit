import React, { useMemo } from 'react';
import { Visit, FBEvaluation } from '../types/schema';
import { Calendar, Target } from 'lucide-react';

interface QuarterlyScoreBoxesProps {
  visits: Visit[];
  evaluations: FBEvaluation[];
}

interface QuarterConfig {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  name: string;
  monthsLabel: string;
  months: number[]; // 0-indexed month numbers
}

const QUARTERS: QuarterConfig[] = [
  { id: 'Q1', name: 'Q1', monthsLabel: 'Jan–Mar', months: [0, 1, 2] },
  { id: 'Q2', name: 'Q2', monthsLabel: 'Apr–Jun', months: [3, 4, 5] },
  { id: 'Q3', name: 'Q3', monthsLabel: 'Jul–Sep', months: [6, 7, 8] },
  { id: 'Q4', name: 'Q4', monthsLabel: 'Oct–Dec', months: [9, 10, 11] },
];

const TARGET_BENCHMARK = 95.0;

// Helper to reliably extract year and 0-indexed month without timezone shifts
function parseVisitYearMonth(dateStr: string, fallbackYear?: number): { year: number; month: number } {
  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        return { year: y, month: m };
      }
    }
  }
  const d = new Date(dateStr);
  return {
    year: fallbackYear || (!isNaN(d.getFullYear()) ? d.getFullYear() : 2026),
    month: !isNaN(d.getMonth()) ? d.getMonth() : 0,
  };
}

export const QuarterlyScoreBoxes: React.FC<QuarterlyScoreBoxesProps> = ({
  visits,
  evaluations,
}) => {
  // 1. Rolling Year Logic: Dynamically calculate the current calendar year
  const currentYear = useMemo(() => {
    if (visits.length === 0) return new Date().getFullYear();
    const years = visits.map((v) => {
      if (v.periodYear) return v.periodYear;
      return parseVisitYearMonth(v.visitDate).year;
    });
    return Math.max(...years);
  }, [visits]);

  const previousYear = currentYear - 1;

  // 2. Score calculator for a specific year and quarter month range
  const calculateQuarterStats = (year: number, months: number[]) => {
    // Filter visits matching calendar year and quarter months
    const quarterVisits = visits.filter((v) => {
      const { year: vYear, month: vMonth } = parseVisitYearMonth(v.visitDate, v.periodYear);
      return vYear === year && months.includes(vMonth);
    });

    if (quarterVisits.length === 0) {
      return {
        score: null,
        actualPts: 0,
        possiblePts: 0,
        auditCount: 0,
      };
    }

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
      };
    }

    // Fallback: Use visit-level catering percentage if individual evaluations are absent
    const validVisits = quarterVisits.filter(
      (v) => typeof v.cateringOverallPercentage === 'number' || typeof v.overallPercentage === 'number'
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
      };
    }

    return {
      score: null,
      actualPts: 0,
      possiblePts: 0,
      auditCount: quarterVisits.length,
    };
  };

  return (
    <div className="space-y-2">
      {/* Section Sub-heading */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold tracking-wide uppercase text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>Quarterly Catering Performance ({currentYear})</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Target className="w-3 h-3 text-emerald-400" />
          <span>Target Benchmark: <strong className="text-slate-300 font-mono">95.0%</strong></span>
        </div>
      </div>

      {/* 4 Permanent Metric Boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {QUARTERS.map((q) => {
          const currentStats = calculateQuarterStats(currentYear, q.months);
          const previousStats = calculateQuarterStats(previousYear, q.months);

          // RAG Conditional Formatting
          const hasData = currentStats.score !== null;
          const isAtOrAboveTarget = hasData && currentStats.score! >= TARGET_BENCHMARK;
          const isBelowTarget = hasData && currentStats.score! < TARGET_BENCHMARK;

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

          // Year-over-Year (YoY) Variance calculation vs Last Year (LY)
          let yoyText = '— vs LY';
          let yoyColorClass = 'text-slate-500';

          if (hasData && previousStats.score !== null) {
            const variance = Math.round((currentStats.score! - previousStats.score) * 10) / 10;
            const sign = variance > 0 ? '+' : '';
            yoyText = `${sign}${variance.toFixed(1)}% vs LY`;
            yoyColorClass = variance >= 0 ? 'text-emerald-400' : 'text-rose-400';
          } else if (hasData) {
            yoyText = 'N/A vs LY';
            yoyColorClass = 'text-slate-400';
          }

          return (
            <div
              key={q.id}
              className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between transition-all hover:border-slate-700"
            >
              {/* Header: Quarter & Months */}
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

              {/* Main Score Value (RAG conditional formatting) */}
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

              {/* YoY Variance beneath score */}
              <div className="mt-2 text-xs flex items-center justify-between">
                <span className={`font-mono text-[11px] tabular-nums font-medium ${yoyColorClass}`}>
                  {yoyText}
                </span>
                {hasData && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentStats.auditCount} {currentStats.auditCount === 1 ? 'audit' : 'audits'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
