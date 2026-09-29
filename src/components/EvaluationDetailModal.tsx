import React from 'react';
import { FBEvaluation, Visit, StaffInteraction } from '../types/schema';
import { FB_AREAS } from '../data/mockData';
import { X, CheckCircle, ShieldCheck, Clock, Receipt, User, Award, Quote } from 'lucide-react';

interface EvaluationDetailModalProps {
  evaluation: FBEvaluation | null;
  visit?: Visit;
  staff: StaffInteraction[];
  onClose: () => void;
}

export const EvaluationDetailModal: React.FC<EvaluationDetailModalProps> = ({
  evaluation,
  visit,
  staff,
  onClose,
}) => {
  if (!evaluation) return null;

  const area = FB_AREAS[evaluation.areaId];

  const formatUKDate = (isoStr?: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoStr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: area?.themeColor || '#F59E0B' }}
              />
              <h2 className="text-lg font-bold text-white tracking-tight">
                {area?.name || evaluation.areaId} Audit Detail
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span>Visit: <strong className="text-slate-200 font-mono">{visit?.visitCode}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Date of Visit: <strong className="text-slate-200 font-mono tabular-nums">{formatUKDate(visit?.visitDate)}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Audit Time: <strong className="text-slate-200 font-mono tabular-nums">{evaluation.evaluationTime}</strong></span>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Top Score Banner */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Section Score Awarded
              </div>
              <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-2 mt-1">
                <span>{evaluation.actualScore} / {evaluation.possibleScore}</span>
                <span className="text-base text-emerald-400">
                  ({evaluation.scorePercentage.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Purchase Spend</div>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  £{evaluation.purchaseSpend.toFixed(2)}
                </div>
              </div>

              <div className="pl-4 border-l border-slate-800">
                <div className="text-[11px] text-slate-400">Natasha's Law Allergen Check</div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Compliant (Asked at Till)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Named Staff Encounters */}
          {staff.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Identified Catering Personnel</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {staff.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-950/60 rounded border border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
                      {s.staffName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{s.staffName}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.keyRecognitions.map((k, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verbatim Mystery Shopper Narrative */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Mystery Shopper Narrative Review</span>
            </h3>
            <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 text-slate-200 italic leading-relaxed text-xs">
              "{evaluation.narrativeReview}"
            </div>
          </div>

          {/* Specific Survey Criteria Responses */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-400" />
              <span>Detailed Section Answers & Ratings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Area Cleanliness & Floors:</span>
                <span className="text-emerald-400 font-medium font-mono">5/5 (Immaculate)</span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Staff Presentation & Uniform:</span>
                <span className="text-emerald-400 font-medium font-mono">5/5 (Immaculate)</span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Name Badge Worn & Legible:</span>
                <span className="text-emerald-400 font-medium">Yes</span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Friendly Greeting / Acknowledgement:</span>
                <span className="text-emerald-400 font-medium">{evaluation.friendlyGreeting}</span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Queue Flow & Attention:</span>
                <span className="text-emerald-400 font-medium">{evaluation.queueManagement}</span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Active Till Engagement:</span>
                <span className="text-emerald-400 font-medium">{evaluation.tillEngagement}</span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Additional Offer / Assistance:</span>
                <span className="text-emerald-400 font-medium">{evaluation.additionalItemsOffered}</span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Natasha's Law Allergy Enquiry:</span>
                <span className="text-emerald-400 font-medium font-mono">1/1 (Yes - Asked)</span>
              </div>
              {evaluation.butterbeerOffered !== undefined && evaluation.butterbeerOffered !== null && (
                <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Offered Butterbeer with Food:</span>
                  <span className="text-emerald-400 font-medium font-mono">
                    {evaluation.butterbeerOffered ? '1/1 (Yes)' : '0/1 (No)'}
                  </span>
                </div>
              )}
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Staff Body Language:</span>
                <span className="text-emerald-400 font-medium">{evaluation.bodyLanguage}</span>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Overall Experience Rating:</span>
                <span className="text-emerald-400 font-medium">{evaluation.expectationsExceeded}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
