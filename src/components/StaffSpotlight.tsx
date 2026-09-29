import React, { useState, useMemo } from 'react';
import { StaffInteraction, Visit } from '../types/schema';
import { FB_AREAS } from '../data/mockData';
import { Award, ShieldCheck, Sparkles, Copy, Check, Quote, User, Calendar } from 'lucide-react';

interface StaffSpotlightProps {
  staffInteractions: StaffInteraction[];
  visits?: Visit[];
}

export const StaffSpotlight: React.FC<StaffSpotlightProps> = ({
  staffInteractions,
  visits = [],
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Month names helper
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Map visit lookup by visitId
  const visitMap = useMemo(() => {
    const map = new Map<string, Visit>();
    visits.forEach((v) => {
      map.set(v.id, v);
      map.set(v.visitCode, v);
    });
    return map;
  }, [visits]);

  // Helper to format month name from ISO date (e.g. '2026-09-21' -> 'September 2026')
  const getMonthAndPeriodLabel = (visit?: Visit) => {
    if (!visit) return 'Unknown Period';
    let monthName = '';
    if (visit.visitDate) {
      const parts = visit.visitDate.split('-');
      if (parts.length >= 2) {
        const monthIdx = parseInt(parts[1], 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          monthName = MONTH_NAMES[monthIdx];
        }
      }
    }
    const periodStr = visit.periodNumber ? `Period ${visit.periodNumber}` : visit.visitCode;
    return monthName ? `${periodStr} (${monthName} ${visit.periodYear || ''})`.trim() : periodStr;
  };

  // Compile list of available periods / months for the dropdown selector
  const availablePeriods = useMemo(() => {
    const periodsMap = new Map<string, { key: string; label: string; count: number }>();

    visits.forEach((v) => {
      const periodKey = `P${v.periodNumber || v.visitCode}`;
      const label = getMonthAndPeriodLabel(v);
      if (!periodsMap.has(periodKey)) {
        periodsMap.set(periodKey, { key: periodKey, label, count: 0 });
      }
    });

    // Count staff interactions per period
    staffInteractions.forEach((item) => {
      const visit = visitMap.get(item.visitId);
      if (visit) {
        const periodKey = `P${visit.periodNumber || visit.visitCode}`;
        const existing = periodsMap.get(periodKey);
        if (existing) {
          existing.count += 1;
        } else {
          periodsMap.set(periodKey, {
            key: periodKey,
            label: getMonthAndPeriodLabel(visit),
            count: 1,
          });
        }
      }
    });

    return Array.from(periodsMap.values());
  }, [visits, staffInteractions, visitMap]);

  // Filter staff interactions by period (month), area, and search query
  const filteredStaff = useMemo(() => {
    return staffInteractions.filter((item) => {
      const visit = visitMap.get(item.visitId);
      const periodKey = visit ? `P${visit.periodNumber || visit.visitCode}` : '';

      // 1. Period (Month) filter
      const matchesPeriod =
        selectedPeriod === 'all' ||
        periodKey === selectedPeriod ||
        item.visitId === selectedPeriod;

      // 2. Catering Area filter
      const matchesArea = selectedArea === 'all' || item.areaId === selectedArea;

      // 3. Search query
      const matchesQuery =
        !searchQuery.trim() ||
        item.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.specificNarrativeExcerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.roleDescription && item.roleDescription.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesPeriod && matchesArea && matchesQuery;
    });
  }, [staffInteractions, visitMap, selectedPeriod, selectedArea, searchQuery]);

  const copyCommendation = (item: StaffInteraction) => {
    const visit = visitMap.get(item.visitId);
    const periodLabel = getMonthAndPeriodLabel(visit);
    const text = `STAFF COMMENDATION - ${item.staffName.toUpperCase()} (${FB_AREAS[item.areaId]?.shortName || item.areaId})\n${periodLabel} · Audit Encounter: ${item.interactionTime}\nRecognitions: ${item.keyRecognitions.join(', ')}\nShopper Narrative: "${item.specificNarrativeExcerpt}"`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatUKDate = (isoStr?: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoStr;
  };

  return (
    <div className="space-y-4">
      {/* Section Title & Filter Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">
              Staff Spotlight & Service Commendations
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Employees specifically commended in mystery shopper audits, selectable by period (month) and catering area.
          </p>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period (Month) Selector Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline font-medium text-slate-300">Period (Month):</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer font-medium"
            >
              <option value="all">All Periods / Months ({staffInteractions.length})</option>
              {availablePeriods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Area Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-md border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedArea('all')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedArea === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Areas
            </button>
            <button
              onClick={() => setSelectedArea('food_hall')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedArea === 'food_hall'
                  ? 'bg-amber-500/20 text-amber-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Food Hall
            </button>
            <button
              onClick={() => setSelectedArea('backlot')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedArea === 'backlot'
                  ? 'bg-blue-500/20 text-blue-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Backlot
            </button>
            <button
              onClick={() => setSelectedArea('butterbeer')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedArea === 'butterbeer'
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Butterbeer
            </button>
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search staff or praise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-44"
          />
        </div>
      </div>

      {/* Staff Spotlight Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((item) => {
          const area = FB_AREAS[item.areaId];
          const visit = visitMap.get(item.visitId);
          const periodLabel = getMonthAndPeriodLabel(visit);

          return (
            <div
              key={item.id}
              className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                {/* Header: Name, Department, Period (Month) & Date */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800/70 pb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-400 shrink-0" />
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {item.staffName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                      <span
                        className="font-semibold font-mono"
                        style={{ color: area?.themeColor || '#F59E0B' }}
                      >
                        {area?.shortName || item.areaId}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-amber-300 font-medium font-mono">{periodLabel}</span>
                      {visit?.visitDate && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400 font-mono tabular-nums">{formatUKDate(visit.visitDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Service Details & Criteria */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Encounter Time: <strong className="text-slate-200 font-mono tabular-nums">{item.interactionTime}</strong></span>
                  <span>Greeting: <strong className="text-emerald-400">{item.friendlyGreetingRating}</strong></span>
                </div>

                {/* Specific Service Criteria Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.allergyChecked && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Allergy Inquired</span>
                    </span>
                  )}
                  {item.keyRecognitions.map((badge, bIdx) => (
                    <span
                      key={bIdx}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>

                {/* Highlighted Verbatim Mystery Shopper Narrative */}
                <div className="mt-3.5 relative bg-slate-950/60 rounded p-3 border border-slate-800/70 text-xs text-slate-300 italic leading-relaxed">
                  <Quote className="w-4 h-4 text-amber-400/40 absolute -top-1.5 -left-1.5" />
                  <p className="relative z-10 pl-2">
                    "{item.specificNarrativeExcerpt}"
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  Queue Attention: {item.queueManagementRating}
                </span>

                <button
                  onClick={() => copyCommendation(item)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Copy commendation citation for team briefing / recognition certificate"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Citation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-12 text-center">
          <Award className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-300 font-medium">No staff recognitions match your criteria</p>
          <p className="text-xs text-slate-500 mt-1">
            Try choosing "All Periods / Months" or clearing the search filter.
          </p>
        </div>
      )}
    </div>
  );
};
