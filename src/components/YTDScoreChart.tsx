import React, { useState, useMemo } from 'react';
import { Visit, FBEvaluation, FBAreaId } from '../types/schema';
import { FB_AREAS } from '../data/mockData';
import { Check, Info } from 'lucide-react';

interface YTDScoreChartProps {
  visits: Visit[];
  evaluations: FBEvaluation[];
  onSelectVisit?: (visitCode: string) => void;
}

export const YTDScoreChart: React.FC<YTDScoreChartProps> = ({
  visits,
  evaluations,
  onSelectVisit,
}) => {
  // Enabled series toggles
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    food_hall: true,
    backlot: true,
    butterbeer: true,
    combined: false,
  });

  const [hoveredPoint, setHoveredPoint] = useState<{
    visitCode: string;
    visitDate: string;
    areaId: string;
    areaName: string;
    scoreActual: number;
    scorePossible: number;
    percentage: number;
    narrativePreview?: string;
    x: number;
    y: number;
  } | null>(null);

  // Sort visits chronologically (oldest to newest)
  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());
  }, [visits]);

  // Dimensions for responsive SVG coordinate space
  const svgWidth = 840;
  const svgHeight = 280;
  const padding = { top: 25, right: 30, bottom: 45, left: 55 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Scale mode: 'full' (0% - 100% true baseline) or 'focused' (70% - 100%)
  const [scaleMode, setScaleMode] = useState<'full' | 'focused'>('full');

  // Y-axis range: 0% to 100% to represent data accurately from zero baseline
  const minY = scaleMode === 'full' ? 0 : 70;
  const maxY = 100;

  const getYCoord = (pct: number) => {
    const clamped = Math.max(minY, Math.min(maxY, pct));
    const normalized = (clamped - minY) / (maxY - minY);
    return padding.top + chartHeight - normalized * chartHeight;
  };

  const getXCoord = (index: number) => {
    if (sortedVisits.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (sortedVisits.length - 1)) * chartWidth;
  };

  // Compile data points for each series
  const seriesData = useMemo(() => {
    const areas: { id: FBAreaId; name: string; color: string }[] = [
      { id: 'food_hall', name: FB_AREAS.food_hall.shortName, color: '#F59E0B' }, // Amber
      { id: 'backlot', name: FB_AREAS.backlot.shortName, color: '#3B82F6' },     // Blue
      { id: 'butterbeer', name: FB_AREAS.butterbeer.shortName, color: '#10B981' }, // Emerald
    ];

    const mapped = areas.map((area) => {
      const points = sortedVisits.map((v, i) => {
        const evalItem = evaluations.find((e) => e.visitId === v.id && e.areaId === area.id);
        const percentage = evalItem ? evalItem.scorePercentage : 100;
        return {
          visitCode: v.visitCode,
          visitDate: v.visitDate,
          actual: evalItem?.actualScore ?? (area.id === 'backlot' ? 57 : 56),
          possible: evalItem?.possibleScore ?? (area.id === 'backlot' ? 57 : 56),
          percentage,
          narrativePreview: evalItem?.narrativeReview,
          x: getXCoord(i),
          y: getYCoord(percentage),
        };
      });

      return {
        ...area,
        points,
      };
    });

    // Add Combined F&B series
    const combinedPoints = sortedVisits.map((v, i) => {
      const evals = evaluations.filter((e) => e.visitId === v.id);
      const totalAct = evals.reduce((sum, e) => sum + e.actualScore, 0);
      const totalPos = evals.reduce((sum, e) => sum + e.possibleScore, 0);
      const percentage = totalPos > 0 ? (totalAct / totalPos) * 100 : 100;
      return {
        visitCode: v.visitCode,
        visitDate: v.visitDate,
        actual: totalAct,
        possible: totalPos,
        percentage,
        narrativePreview: `Combined F&B score for ${v.visitCode}: ${totalAct}/${totalPos} points (${percentage.toFixed(1)}%)`,
        x: getXCoord(i),
        y: getYCoord(percentage),
      };
    });

    return [
      ...mapped,
      {
        id: 'combined' as any,
        name: 'Combined Catering Benchmark',
        color: '#A855F7',
        points: combinedPoints,
      },
    ];
  }, [sortedVisits, evaluations]);

  // Generate SVG path string
  const createPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points.reduce((path, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${path} L ${pt.x},${pt.y}`;
    }, '');
  };

  // Format date to UK notation (DD/MM)
  const formatUKDate = (isoStr: string) => {
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return isoStr;
  };

  const toggleSeries = (id: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
      {/* Chart Header & Series Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Year-to-Date Catering Score Trajectory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit score progression across Food Hall, Backlot, and Butterbeer (Target: 95.0%)
          </p>
        </div>

        {/* Series & Scale Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Scale baseline selector */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded border border-slate-800 text-xs">
            <button
              onClick={() => setScaleMode('full')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                scaleMode === 'full'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Standard 0% to 100% true baseline scale"
            >
              0% – 100% Baseline
            </button>
            <button
              onClick={() => setScaleMode('focused')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                scaleMode === 'focused'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="70% to 100% focused range view"
            >
              70% – 100% Zoom
            </button>
          </div>

          {/* Series Filter Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => toggleSeries('food_hall')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                visibleSeries.food_hall
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/80 text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Food Hall</span>
            </button>

            <button
              onClick={() => toggleSeries('backlot')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                visibleSeries.backlot
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800/80 text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Backlot</span>
            </button>

            <button
              onClick={() => toggleSeries('butterbeer')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                visibleSeries.butterbeer
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800/80 text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Butterbeer</span>
            </button>

            <button
              onClick={() => toggleSeries('combined')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                visibleSeries.combined
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-slate-800/80 text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Combined Total</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      {sortedVisits.length === 0 ? (
        <div className="py-14 text-center text-slate-400 space-y-2">
          <p className="text-sm font-medium text-slate-300">No catering audit data on file</p>
          <p className="text-xs text-slate-500">
            Ingest a mystery shopper report to visualise score trajectories.
          </p>
        </div>
      ) : (
        <div className="relative mt-4 w-full overflow-x-auto">
          {sortedVisits.length === 1 && (
            <div className="mb-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded flex items-center justify-between">
              <span>
                Showing 1 actual audit on file (<strong>{sortedVisits[0].visitCode}</strong> on {formatUKDate(sortedVisits[0].visitDate)}/2026).
              </span>
              <span className="text-[11px] text-slate-400">
                Additional visits will automatically generate continuous trend lines.
              </span>
            </div>
          )}
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[680px] select-none"
          >
          {/* Grid lines and Y-axis labels */}
          {(scaleMode === 'full' ? [0, 20, 40, 60, 80, 100] : [70, 75, 80, 85, 90, 95, 100]).map((val) => {
            const y = getYCoord(val);
            return (
              <g key={val} className="text-slate-600">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray={val === 95 ? '4,4' : '2,4'}
                  strokeWidth={val === 95 ? 1.5 : 0.8}
                  strokeOpacity={val === 95 ? 0.9 : 0.4}
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94A3B8"
                  className="font-mono tabular-nums"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* 95% Benchmark Target Label */}
          <g>
            <line
              x1={padding.left}
              y1={getYCoord(95)}
              x2={svgWidth - padding.right}
              y2={getYCoord(95)}
              stroke="#F59E0B"
              strokeDasharray="4,4"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />
            <text
              x={svgWidth - padding.right - 5}
              y={getYCoord(95) - 5}
              textAnchor="end"
              fontSize="9"
              fill="#FBBF24"
              className="font-medium"
            >
              95% Catering Benchmark
            </text>
          </g>

          {/* X-axis tick labels (Visits) */}
          {sortedVisits.map((v, i) => {
            const x = getXCoord(i);
            return (
              <g key={v.id} className="cursor-pointer" onClick={() => onSelectVisit && onSelectVisit(v.visitCode)}>
                <line
                  x1={x}
                  y1={svgHeight - padding.bottom}
                  x2={x}
                  y2={svgHeight - padding.bottom + 5}
                  stroke="#475569"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={svgHeight - padding.bottom + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#E2E8F0"
                  fontWeight="600"
                  className="font-mono"
                >
                  {v.visitCode}
                </text>
                <text
                  x={x}
                  y={svgHeight - padding.bottom + 30}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#94A3B8"
                  className="font-mono tabular-nums"
                >
                  {formatUKDate(v.visitDate)}
                </text>
              </g>
            );
          })}

          {/* Plot Lines */}
          {seriesData.map((series) => {
            if (!visibleSeries[series.id]) return null;
            const pathD = createPath(series.points);
            return (
              <g key={series.id}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={series.id === 'combined' ? '2.5' : '2'}
                  strokeDasharray={series.id === 'combined' ? '6,3' : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
                {/* Data Points */}
                {series.points.map((pt, pIdx) => (
                  <circle
                    key={`${series.id}-${pIdx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.visitCode === pt.visitCode && hoveredPoint?.areaId === series.id ? 6 : 4}
                    fill={series.color}
                    stroke="#0F172A"
                    strokeWidth="2"
                    className="cursor-pointer transition-all hover:scale-125"
                    onMouseEnter={() => {
                      setHoveredPoint({
                        visitCode: pt.visitCode,
                        visitDate: pt.visitDate,
                        areaId: series.id,
                        areaName: series.name,
                        scoreActual: pt.actual,
                        scorePossible: pt.possible,
                        percentage: pt.percentage,
                        narrativePreview: pt.narrativePreview,
                        x: pt.x,
                        y: pt.y,
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => onSelectVisit && onSelectVisit(pt.visitCode)}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900 border border-slate-700 shadow-xl rounded-md p-3 text-xs w-64 -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
            }}
          >
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-semibold text-white">{hoveredPoint.areaName}</span>
              <span className="font-mono text-[11px]">{hoveredPoint.visitCode}</span>
            </div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-slate-400">Section Score:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono font-bold text-white tabular-nums">
                  {hoveredPoint.scoreActual}/{hoveredPoint.scorePossible}
                </span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    hoveredPoint.percentage >= 100
                      ? 'text-emerald-400'
                      : hoveredPoint.percentage >= 95
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  ({hoveredPoint.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mb-1">
              Visit Date: {formatUKDate(hoveredPoint.visitDate)}/2026
            </div>
            {hoveredPoint.narrativePreview && (
              <p className="text-[11px] text-slate-300 italic line-clamp-2 mt-1 border-t border-slate-800/80 pt-1">
                "{hoveredPoint.narrativePreview.slice(0, 100)}..."
              </p>
            )}
          </div>
        )}
      </div>
      )}

      {/* Legend & Footnote */}
      <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Click any audit node to filter the evaluation grid directly.</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Max Score: Food Hall (56 pts)</span>
          <span>·</span>
          <span>Backlot (57 pts)</span>
          <span>·</span>
          <span>Butterbeer (56 pts)</span>
        </div>
      </div>
    </div>
  );
};
