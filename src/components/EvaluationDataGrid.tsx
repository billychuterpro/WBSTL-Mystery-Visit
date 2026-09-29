import React, { useState, useMemo } from 'react';
import { FBEvaluation, Visit, StaffInteraction, FBAreaId } from '../types/schema';
import { FB_AREAS } from '../data/mockData';
import { Search, Filter, ShieldCheck, Download, ChevronRight, ArrowUpDown, Eye } from 'lucide-react';

interface EvaluationDataGridProps {
  evaluations: FBEvaluation[];
  visits: Visit[];
  staffInteractions: StaffInteraction[];
  onSelectEvaluation: (evaluation: FBEvaluation) => void;
  selectedVisitCodeFilter?: string | null;
  onClearVisitFilter?: () => void;
}

export const EvaluationDataGrid: React.FC<EvaluationDataGridProps> = ({
  evaluations,
  visits,
  staffInteractions,
  onSelectEvaluation,
  selectedVisitCodeFilter,
  onClearVisitFilter,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(selectedVisitCodeFilter || 'all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [allergyFilter, setAllergyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'date' | 'score' | 'spend' | 'area'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sync if parent updates visit filter
  React.useEffect(() => {
    if (selectedVisitCodeFilter) {
      setSelectedPeriod(selectedVisitCodeFilter);
    }
  }, [selectedVisitCodeFilter]);

  // Map visit lookup
  const visitMap = useMemo(() => {
    const map = new Map<string, Visit>();
    visits.forEach((v) => map.set(v.id, v));
    return map;
  }, [visits]);

  // Map staff interactions to evaluations
  const staffByEvalId = useMemo(() => {
    const map = new Map<string, StaffInteraction[]>();
    staffInteractions.forEach((si) => {
      const existing = map.get(si.evaluationId) || [];
      existing.push(si);
      map.set(si.evaluationId, existing);
    });
    return map;
  }, [staffInteractions]);

  // Unique visit codes for dropdown
  const uniqueVisitCodes = useMemo(() => {
    const codes = Array.from(new Set(visits.map((v) => v.visitCode)));
    return codes;
  }, [visits]);

  // Filtered & sorted records
  const filteredData = useMemo(() => {
    return evaluations
      .filter((evalItem) => {
        const visit = visitMap.get(evalItem.visitId);
        const staff = staffByEvalId.get(evalItem.id) || [];
        const staffNames = staff.map((s) => s.staffName).join(' ');

        // Period filter
        if (selectedPeriod !== 'all' && visit?.visitCode !== selectedPeriod) {
          return false;
        }

        // Area filter
        if (selectedArea !== 'all' && evalItem.areaId !== selectedArea) {
          return false;
        }

        // Allergy filter
        if (allergyFilter === 'compliant' && !evalItem.allergyQuestionAsked) {
          return false;
        }
        if (allergyFilter === 'non_compliant' && evalItem.allergyQuestionAsked) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesStaff = staffNames.toLowerCase().includes(q);
          const matchesNarrative = evalItem.narrativeReview.toLowerCase().includes(q);
          const matchesArea = FB_AREAS[evalItem.areaId]?.name.toLowerCase().includes(q);
          const matchesCode = visit?.visitCode.toLowerCase().includes(q);
          if (!matchesStaff && !matchesNarrative && !matchesArea && !matchesCode) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const visitA = visitMap.get(a.visitId);
        const visitB = visitMap.get(b.visitId);

        let comparison = 0;
        if (sortField === 'date') {
          const dateA = visitA ? new Date(visitA.visitDate).getTime() : 0;
          const dateB = visitB ? new Date(visitB.visitDate).getTime() : 0;
          comparison = dateA - dateB;
        } else if (sortField === 'score') {
          comparison = a.scorePercentage - b.scorePercentage;
        } else if (sortField === 'spend') {
          comparison = a.purchaseSpend - b.purchaseSpend;
        } else if (sortField === 'area') {
          comparison = a.areaId.localeCompare(b.areaId);
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [evaluations, visitMap, staffByEvalId, selectedPeriod, selectedArea, allergyFilter, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: 'date' | 'score' | 'spend' | 'area') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Export filtered dataset to CSV
  const exportCSV = () => {
    const headers = [
      'Visit Code',
      'Visit Date (UK)',
      'Department',
      'Actual Score',
      'Possible Score',
      'Score %',
      'Spend (£)',
      'Staff Mentioned',
      'Allergy Checked',
      'Shopper Narrative',
    ];

    const rows = filteredData.map((e) => {
      const visit = visitMap.get(e.visitId);
      const staff = (staffByEvalId.get(e.id) || []).map((s) => s.staffName).join('; ');
      return [
        `"${visit?.visitCode || ''}"`,
        `"${visit?.visitDate || ''}"`,
        `"${FB_AREAS[e.areaId]?.name || e.areaId}"`,
        e.actualScore,
        e.possibleScore,
        `"${e.scorePercentage.toFixed(2)}%"`,
        e.purchaseSpend.toFixed(2),
        `"${staff.replace(/"/g, '""')}"`,
        e.allergyQuestionAsked ? 'YES' : 'NO',
        `"${e.narrativeReview.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mystery_Shopper_Catering_Records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatUKDate = (isoStr?: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoStr;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Catering Audit Evaluations Grid
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Filterable inspection log with section scores, audit narratives, and Natasha's Law compliance.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="hidden sm:inline">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                if (onClearVisitFilter && e.target.value === 'all') {
                  onClearVisitFilter();
                }
              }}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">All Periods (YTD)</option>
              {uniqueVisitCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="hidden sm:inline">Area:</span>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">All F&B Areas</option>
              <option value="food_hall">Food Hall</option>
              <option value="backlot">Backlot</option>
              <option value="butterbeer">Butterbeer</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search narrative or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-48"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Active Filter Notice */}
      {selectedPeriod !== 'all' && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
          <span>
            Filtered by Visit: <strong>{selectedPeriod}</strong> ({filteredData.length} area evaluations)
          </span>
          <button
            onClick={() => {
              setSelectedPeriod('all');
              if (onClearVisitFilter) onClearVisitFilter();
            }}
            className="hover:underline cursor-pointer text-amber-400 font-medium"
          >
            Show All Visits
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider">
              <th
                onClick={() => toggleSort('date')}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Visit / Date</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('area')}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>F&B Area</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('score')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('spend')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Spend</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold">Staff Mentioned</th>
              <th className="py-3 px-4 font-semibold text-center">Allergy Check</th>
              <th className="py-3 px-4 font-semibold">Shopper Review Narrative</th>
              <th className="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredData.map((evalItem) => {
              const visit = visitMap.get(evalItem.visitId);
              const staff = staffByEvalId.get(evalItem.id) || [];
              const area = FB_AREAS[evalItem.areaId];

              return (
                <tr
                  key={evalItem.id}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => onSelectEvaluation(evalItem)}
                >
                  {/* Visit Code & Date */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-white font-mono">{visit?.visitCode}</div>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {formatUKDate(visit?.visitDate)}
                    </div>
                  </td>

                  {/* F&B Area */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className="font-medium"
                      style={{ color: area?.themeColor || '#F59E0B' }}
                    >
                      {area?.shortName || evalItem.areaId}
                    </span>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {evalItem.evaluationTime}
                    </div>
                  </td>

                  {/* Score */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="font-mono font-bold text-white tabular-nums">
                      {evalItem.actualScore}/{evalItem.possibleScore}
                    </div>
                    <div
                      className={`text-[11px] font-mono tabular-nums font-semibold ${
                        evalItem.scorePercentage >= 100
                          ? 'text-emerald-400'
                          : evalItem.scorePercentage >= 95
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {evalItem.scorePercentage.toFixed(1)}%
                    </div>
                  </td>

                  {/* Spend */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums text-slate-300 font-medium">
                    £{evalItem.purchaseSpend.toFixed(2)}
                  </td>

                  {/* Staff Mentioned */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {staff.length > 0 ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200">
                          {staff[0].staffName}
                        </span>
                        {staff.length > 1 && (
                          <span className="text-[10px] text-slate-400">
                            +{staff.length - 1} more ({staff.slice(1).map((s) => s.staffName).join(', ')})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Unidentified team</span>
                    )}
                  </td>

                  {/* Allergy Checked */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {evalItem.allergyQuestionAsked ? (
                      <span
                        className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium"
                        title="Natasha's Law Allergen Inquiry Verified"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Yes</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 text-[11px] font-medium">
                        No
                      </span>
                    )}
                  </td>

                  {/* Narrative snippet */}
                  <td className="py-3 px-4 max-w-xs xl:max-w-md">
                    <p className="text-slate-300 text-xs line-clamp-2 italic leading-relaxed">
                      "{evalItem.narrativeReview}"
                    </p>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvaluation(evalItem);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-amber-400" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div className="p-8 text-center text-slate-400">
          No catering evaluations found matching the specified filters.
        </div>
      )}

      {/* Footer Info */}
      <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Showing {filteredData.length} of {evaluations.length} total catering evaluations</span>
        <span>Standard F&B Audit Denominators: Food Hall (56), Backlot (57), Butterbeer (56)</span>
      </div>
    </div>
  );
};
