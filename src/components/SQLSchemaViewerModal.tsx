import React, { useState } from 'react';
import { POSTGRES_DDL_SCHEMA } from '../data/sqlSchema';
import { Database, Copy, Check, Table, GitCommit, FileCode, Play, Terminal } from 'lucide-react';

interface SQLSchemaViewerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isStandaloneTab?: boolean;
}

export const SQLSchemaViewerModal: React.FC<SQLSchemaViewerModalProps> = ({
  isOpen = true,
  onClose,
  isStandaloneTab = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ddl' | 'erd' | 'queries'>('ddl');
  const [copied, setCopied] = useState(false);
  const [executedQuery, setExecutedQuery] = useState<string | null>(null);

  if (!isOpen && !isStandaloneTab) return null;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(POSTGRES_DDL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleQueries = [
    {
      title: '1. Year-to-Date Score Trajectory by Catering Department',
      description: 'Calculates the running YTD score average for Food Hall, Backlot, and Butterbeer chronologically.',
      sql: `SELECT 
    v.visit_code,
    v.visit_date,
    a.short_name AS department,
    e.actual_score,
    e.possible_score,
    e.score_percentage,
    ROUND(AVG(e.score_percentage) OVER (
        PARTITION BY a.area_id, v.period_year 
        ORDER BY v.visit_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ), 2) AS running_ytd_average_pct
FROM visits v
JOIN fb_evaluations e ON v.visit_id = e.visit_id
JOIN fb_areas a ON e.area_id = a.area_id
ORDER BY v.visit_date ASC, a.area_id;`,
      resultPreview: [
        { visit_code: 'P9-V2', visit_date: '2026-09-21', department: 'Food Hall', actual_score: 56, possible_score: 56, score_percentage: '100.00%', running_ytd: '100.00%' },
        { visit_code: 'P9-V2', visit_date: '2026-09-21', department: 'Backlot', actual_score: 57, possible_score: 57, score_percentage: '100.00%', running_ytd: '100.00%' },
        { visit_code: 'P9-V2', visit_date: '2026-09-21', department: 'Butterbeer', actual_score: 56, possible_score: 56, score_percentage: '100.00%', running_ytd: '100.00%' },
      ],
    },
    {
      title: '2. Staff Spotlight: Direct Employee to Narrative Link',
      description: 'Extracts named staff members, service criteria, and their highlighted praise from mystery shopper reports.',
      sql: `SELECT 
    si.staff_name,
    a.short_name AS catering_area,
    v.visit_code,
    v.visit_date,
    si.friendly_greeting,
    si.asked_about_allergies,
    si.queue_management,
    si.service_narrative_excerpt
FROM staff_interactions si
JOIN fb_evaluations e ON si.evaluation_id = e.evaluation_id
JOIN visits v ON e.visit_id = v.visit_id
JOIN fb_areas a ON e.area_id = a.area_id
ORDER BY v.visit_date DESC, si.created_at DESC;`,
      resultPreview: [
        { staff_name: 'Essel', catering_area: 'Food Hall', visit_code: 'P9-V2', greeting: 'Exceptional', allergies: 'TRUE', praise: 'Warmly greeted, explained chicken & ribs portions, asked about allergies.' },
        { staff_name: 'Hannah', catering_area: 'Food Hall', visit_code: 'P9-V2', greeting: 'Exceptional', allergies: 'TRUE', praise: 'Delivered food in 14 minutes with a smile, guided to condiment station.' },
        { staff_name: 'Daniella', catering_area: 'Backlot', visit_code: 'P9-V2', greeting: 'Exceptional', allergies: 'TRUE', praise: 'Polite, proactive allergen check, offered Butterbeer, custom meal splitting.' },
        { staff_name: 'Barista Duo', catering_area: 'Butterbeer', visit_code: 'P9-V2', greeting: 'Exceptional', allergies: 'TRUE', praise: 'Warm greeting, explained butterbeer latte, highlighted keepsake souvenir bowl.' },
      ],
    },
    {
      title: "3. Natasha's Law & Allergen Enquiry Audit",
      description: 'Tracks whether catering associates actively asked guests about dietary requirements and allergies.',
      sql: `SELECT 
    a.short_name AS area_name,
    COUNT(si.interaction_id) AS total_encounters_audited,
    SUM(CASE WHEN si.asked_about_allergies = TRUE THEN 1 ELSE 0 END) AS allergen_checks_completed,
    ROUND((SUM(CASE WHEN si.asked_about_allergies = TRUE THEN 1 ELSE 0 END)::numeric / 
           NULLIF(COUNT(si.interaction_id), 0)::numeric) * 100, 2) AS compliance_pct
FROM staff_interactions si
JOIN fb_evaluations e ON si.evaluation_id = e.evaluation_id
JOIN fb_areas a ON e.area_id = a.area_id
GROUP BY a.short_name;`,
      resultPreview: [
        { area_name: 'Food Hall', total: 2, completed: 2, compliance: '100.00%' },
        { area_name: 'Backlot', total: 1, completed: 1, compliance: '100.00%' },
        { area_name: 'Butterbeer', total: 1, completed: 1, compliance: '100.00%' },
      ],
    },
  ];

  const content = (
    <div className="space-y-4">
      {/* Sub navigation bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Relational PostgreSQL Architecture
            </h2>
            <p className="text-xs text-slate-400">
              Schema specification supporting area scores over time and linking staff names directly to narratives.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-md border border-slate-800 text-xs">
            <button
              onClick={() => setActiveSubTab('ddl')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeSubTab === 'ddl'
                  ? 'bg-amber-500/20 text-amber-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SQL DDL Script
            </button>
            <button
              onClick={() => setActiveSubTab('erd')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeSubTab === 'erd'
                  ? 'bg-amber-500/20 text-amber-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entity Relationships (ERD)
            </button>
            <button
              onClick={() => setActiveSubTab('queries')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeSubTab === 'queries'
                  ? 'bg-amber-500/20 text-amber-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Analytical Queries
            </button>
          </div>

          <button
            onClick={handleCopySQL}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded text-xs transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied SQL!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL DDL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: DDL Code */}
      {activeSubTab === 'ddl' && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 mb-2 border-b border-slate-800/80">
            <span className="font-mono">schema.sql (PostgreSQL 14+)</span>
            <span className="text-[11px] text-slate-500">Includes constraints, generated columns & views</span>
          </div>
          <pre className="text-slate-300 font-mono text-xs leading-relaxed overflow-x-auto max-h-[620px] p-2 selection:bg-amber-500 selection:text-slate-950">
            {POSTGRES_DDL_SCHEMA}
          </pre>
        </div>
      )}

      {/* Tab 2: ERD Diagram */}
      {activeSubTab === 'erd' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="text-xs text-slate-400">
            This relational model tracks mystery shopper catering reports across multiple visits per period, stores verbatim shopper feedback, and ties individual team members directly to their praised service encounters.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Table 1: visits */}
            <div className="bg-slate-950 border border-slate-700/80 rounded-lg p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="font-mono font-bold text-amber-400 text-xs">visits</span>
                <span className="text-[10px] text-slate-500 font-mono">1 per audit</span>
              </div>
              <ul className="text-[11px] font-mono space-y-1 text-slate-300">
                <li className="text-amber-300 font-semibold">PK visit_id (UUID)</li>
                <li>visit_code (VARCHAR) [e.g. 'P9-V2']</li>
                <li>period_year (SMALLINT) [2026]</li>
                <li>period_number (SMALLINT) [9]</li>
                <li>visit_number_in_period (SMALLINT) [1 or 2]</li>
                <li>visit_date (DATE) [e.g. 21/09/2026]</li>
                <li>report_date (DATE)</li>
                <li>overall_percentage (NUMERIC)</li>
              </ul>
            </div>

            {/* Table 2: fb_evaluations */}
            <div className="bg-slate-950 border border-blue-500/40 rounded-lg p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="font-mono font-bold text-blue-400 text-xs">fb_evaluations</span>
                <span className="text-[10px] text-slate-500 font-mono">3 per visit</span>
              </div>
              <ul className="text-[11px] font-mono space-y-1 text-slate-300">
                <li className="text-blue-300 font-semibold">PK evaluation_id (UUID)</li>
                <li className="text-amber-300">FK visit_id -&gt; visits.visit_id</li>
                <li className="text-emerald-300">FK area_id -&gt; fb_areas.area_id</li>
                <li>evaluation_time (TIME) [e.g. '12:36']</li>
                <li>actual_score (INT) [e.g. 56 or 57]</li>
                <li>possible_score (INT) [e.g. 56 or 57]</li>
                <li className="text-purple-300">GENERATED score_percentage</li>
                <li>purchase_spend (NUMERIC) [e.g. £30.00]</li>
                <li className="text-amber-200">narrative_review (TEXT)</li>
              </ul>
            </div>

            {/* Table 3: staff_interactions */}
            <div className="bg-slate-950 border border-emerald-500/40 rounded-lg p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="font-mono font-bold text-emerald-400 text-xs">staff_interactions</span>
                <span className="text-[10px] text-slate-500 font-mono">Links to Narratives</span>
              </div>
              <ul className="text-[11px] font-mono space-y-1 text-slate-300">
                <li className="text-emerald-300 font-semibold">PK interaction_id (UUID)</li>
                <li className="text-blue-300">FK evaluation_id -&gt; fb_evaluations</li>
                <li className="text-white font-semibold">staff_name (VARCHAR) [e.g. 'Essel']</li>
                <li>staff_role (VARCHAR)</li>
                <li className="text-emerald-400 font-semibold">asked_about_allergies (BOOL)</li>
                <li>friendly_greeting (VARCHAR)</li>
                <li>queue_management (VARCHAR)</li>
                <li>offered_butterbeer (BOOL)</li>
                <li className="text-amber-200">service_narrative_excerpt (TEXT)</li>
              </ul>
            </div>
          </div>

          {/* Reference Table fb_areas */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-mono font-bold text-purple-400">fb_areas Reference Table:</span>
              <span className="text-slate-400 ml-2">Predefined entries for 'food_hall' (max 56), 'backlot' (max 57), and 'butterbeer' (max 56).</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Ensures strict referential integrity across periods
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Analytical SQL Queries */}
      {activeSubTab === 'queries' && (
        <div className="space-y-4">
          {sampleQueries.map((q, idx) => (
            <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{q.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{q.description}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                <pre className="font-mono text-xs text-amber-300/90 overflow-x-auto whitespace-pre">
                  {q.sql}
                </pre>
              </div>

              {/* Sample output preview */}
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Execution Result Preview:</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px] font-mono">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                        {Object.keys(q.resultPreview[0]).map((k) => (
                          <th key={k} className="p-1.5 uppercase font-semibold">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {q.resultPreview.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30">
                          {Object.values(row).map((val, cIdx) => (
                            <td key={cIdx} className="p-1.5 text-slate-300">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isStandaloneTab) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Relational Database Schema (PostgreSQL)
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <div className="p-6 overflow-y-auto">{content}</div>
      </div>
    </div>
  );
};
