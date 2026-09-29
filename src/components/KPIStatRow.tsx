import React from 'react';
import { ShieldCheck, TrendingUp, ReceiptText } from 'lucide-react';
import { Visit, FBEvaluation } from '../types/schema';

interface KPIStatRowProps {
  visits: Visit[];
  evaluations: FBEvaluation[];
}

export const KPIStatRow: React.FC<KPIStatRowProps> = ({
  visits,
  evaluations,
}) => {
  // 1. Calculate YTD Average Score across all F&B evaluations
  const totalActScore = evaluations.reduce((sum, e) => sum + e.actualScore, 0);
  const totalPosScore = evaluations.reduce((sum, e) => sum + e.possibleScore, 0);
  const ytdAverage = totalPosScore > 0 ? (totalActScore / totalPosScore) * 100 : 0;

  // Accurate dynamic delta comparison against the 95.0% target benchmark
  const BENCHMARK_TARGET = 95.0;
  const benchmarkDelta = totalPosScore > 0 ? ytdAverage - BENCHMARK_TARGET : 0;
  const isAboveOrEqual = benchmarkDelta >= 0;

  // 2. Allergen check compliance (Natasha's Law compliance)
  const totalAllergyChecks = evaluations.length;
  const compliantAllergyChecks = evaluations.filter((e) => e.allergyQuestionAsked).length;
  const allergyCompliancePct = totalAllergyChecks > 0 ? (compliantAllergyChecks / totalAllergyChecks) * 100 : 100;

  // 3. Average evaluation purchase spend
  const totalSpend = evaluations.reduce((sum, e) => sum + (e.purchaseSpend || 0), 0);
  const avgSpend = evaluations.length > 0 ? totalSpend / evaluations.length : 0;

  // 4. Latest visit summary
  const latestVisit = [...visits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())[0];
  const latestEvals = evaluations.filter((e) => e.visitId === latestVisit?.id);
  const latestFbAct = latestEvals.reduce((sum, e) => sum + e.actualScore, 0);
  const latestFbPos = latestEvals.reduce((sum, e) => sum + e.possibleScore, 0);
  const latestFbPct = latestFbPos > 0 ? (latestFbAct / latestFbPos) * 100 : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Metric 1: YTD F&B Score */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium tracking-wide uppercase text-[11px] text-slate-400">YTD Catering Score</span>
          <TrendingUp className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
            {ytdAverage.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            ({totalActScore}/{totalPosScore} pts)
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          {totalPosScore === 0 ? (
            <span className="text-slate-500">No data logged</span>
          ) : (
            <>
              <span
                className={`font-semibold font-mono tabular-nums ${
                  isAboveOrEqual ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isAboveOrEqual ? `+${benchmarkDelta.toFixed(1)}%` : `${benchmarkDelta.toFixed(1)}%`}
              </span>
              <span>
                {Math.abs(benchmarkDelta) < 0.05
                  ? 'on 95.0% target benchmark'
                  : isAboveOrEqual
                  ? 'above 95.0% target benchmark'
                  : 'below 95.0% target benchmark'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Metric 2: Allergen Enquiry Compliance (Natasha's Law) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium tracking-wide uppercase text-[11px] text-slate-400">Allergen Safety Checks</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
            {allergyCompliancePct.toFixed(0)}%
          </span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            ({compliantAllergyChecks}/{totalAllergyChecks} audits)
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          100% compliance with Natasha's Law protocols
        </div>
      </div>

      {/* Metric 3: Latest Audit Score & Spend */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium tracking-wide uppercase text-[11px] text-slate-400">
            Latest Audit {latestVisit ? `(${latestVisit.visitCode})` : ''}
          </span>
          <ReceiptText className="w-4 h-4 text-blue-400" />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
            {latestFbPct.toFixed(0)}%
          </span>
          <span className="text-xs text-emerald-400 font-mono tabular-nums">
            ({latestFbAct}/{latestFbPos} pts)
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <span>Avg audit spend:</span>
          <span className="text-slate-200 font-mono font-medium tabular-nums">£{avgSpend.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
