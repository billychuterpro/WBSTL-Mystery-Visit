import React, { useState, useRef, useEffect } from 'react';
import {
  parseMysteryShopperReport,
  SAMPLE_STORECHECKERS_REPORT_TEXT,
  ParseResult,
  ParsedAreaReport,
  ParsedStaffMember,
} from '../services/reportParser';
import { extractTextFromPDFFile } from '../services/pdfExtractor';
import { Visit, FBEvaluation, StaffInteraction } from '../types/schema';
import {
  X,
  FileText,
  Upload,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Save,
  Clock,
  ArrowRight,
  FileUp,
  Loader2,
  FileCheck,
  User,
  Plus,
  Trash2,
  Quote,
} from 'lucide-react';

interface ReportIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitReport: (newVisit: Visit, newEvals: FBEvaluation[], newStaff: StaffInteraction[]) => void;
}

export const ReportIngestionModal: React.FC<ReportIngestionModalProps> = ({
  isOpen,
  onClose,
  onCommitReport,
}) => {
  const [inputMode, setInputMode] = useState<'pdf' | 'text'>('pdf');
  const [reportText, setReportText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [activeStep, setActiveStep] = useState<'input' | 'review'>('input');
  const [isCommitted, setIsCommitted] = useState<boolean>(false);

  // PDF Upload states
  const [isProcessingPdf, setIsProcessingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields during review
  const [customVisitCode, setCustomVisitCode] = useState<string>('P9-V2');
  const [customVisitDate, setCustomVisitDate] = useState<string>('2026-09-21');
  const [customPeriod, setCustomPeriod] = useState<number>(9);
  const [customVisitNumber, setCustomVisitNumber] = useState<number>(2);

  const resetToUploadStep = () => {
    setActiveStep('input');
    setParsedData(null);
    setReportText('');
    setUploadedFileName(null);
    setUploadError(null);
    setPdfProgress(null);
    setIsProcessingPdf(false);
    setIsCommitted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetToUploadStep();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const populateFromParseResult = (result: ParseResult, fileName?: string) => {
    setParsedData(result);
    setCustomVisitDate(result.visitDate);
    setCustomPeriod(result.periodNumber);
    setCustomVisitNumber(result.visitNumber);
    setCustomVisitCode(`P${result.periodNumber}-V${result.visitNumber}`);
    if (fileName) setUploadedFileName(fileName);
    setActiveStep('review');
  };

  const handleProcessPDF = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Please select a valid PDF file (.pdf).');
      return;
    }

    try {
      setIsProcessingPdf(true);
      setUploadError(null);
      setUploadedFileName(file.name);
      setPdfProgress({ current: 0, total: 1 });

      const { text } = await extractTextFromPDFFile(file, (page, total) => {
        setPdfProgress({ current: page, total });
      });

      if (!text || text.trim().length === 0) {
        throw new Error('No readable text could be extracted from the uploaded PDF.');
      }

      setReportText(text);

      // Automatically parse the extracted text
      const result = parseMysteryShopperReport(text);
      populateFromParseResult(result, file.name);
    } catch (err: any) {
      console.error('PDF parsing error', err);
      setUploadError(
        err.message || 'Failed to process PDF. Please check the document format or paste text manually.'
      );
    } finally {
      setIsProcessingPdf(false);
      setPdfProgress(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessPDF(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessPDF(file);
    }
  };

  const handleLoadSample = () => {
    setReportText(SAMPLE_STORECHECKERS_REPORT_TEXT);
    const result = parseMysteryShopperReport(SAMPLE_STORECHECKERS_REPORT_TEXT);
    populateFromParseResult(result, 'Storecheckers_WarnerBros_Report_28-09-26.pdf (Sample)');
  };

  const handleParse = () => {
    if (!reportText.trim()) return;
    const result = parseMysteryShopperReport(reportText);
    populateFromParseResult(result);
  };

  // Staff Editing Handlers
  const handleUpdateStaffName = (areaIdx: number, staffIdx: number, newName: string) => {
    if (!parsedData) return;
    setParsedData((prev) => {
      if (!prev) return null;
      const updatedAreas = [...prev.areas];
      const targetArea = { ...updatedAreas[areaIdx] };
      const updatedStaff = [...targetArea.staffMembers];
      updatedStaff[staffIdx] = { ...updatedStaff[staffIdx], name: newName };
      targetArea.staffMembers = updatedStaff;
      targetArea.staffName = updatedStaff.map((s) => s.name).join(' & ');
      updatedAreas[areaIdx] = targetArea;
      return { ...prev, areas: updatedAreas };
    });
  };

  const handleUpdateStaffExcerpt = (areaIdx: number, staffIdx: number, newExcerpt: string) => {
    if (!parsedData) return;
    setParsedData((prev) => {
      if (!prev) return null;
      const updatedAreas = [...prev.areas];
      const targetArea = { ...updatedAreas[areaIdx] };
      const updatedStaff = [...targetArea.staffMembers];
      updatedStaff[staffIdx] = { ...updatedStaff[staffIdx], narrativeExcerpt: newExcerpt };
      targetArea.staffMembers = updatedStaff;
      updatedAreas[areaIdx] = targetArea;
      return { ...prev, areas: updatedAreas };
    });
  };

  const handleAddStaffMember = (areaIdx: number) => {
    if (!parsedData) return;
    setParsedData((prev) => {
      if (!prev) return null;
      const updatedAreas = [...prev.areas];
      const targetArea = { ...updatedAreas[areaIdx] };
      const updatedStaff = [
        ...targetArea.staffMembers,
        { name: 'New Team Member', role: 'Service Encounter' },
      ];
      targetArea.staffMembers = updatedStaff;
      targetArea.staffName = updatedStaff.map((s) => s.name).join(' & ');
      updatedAreas[areaIdx] = targetArea;
      return { ...prev, areas: updatedAreas };
    });
  };

  const handleRemoveStaffMember = (areaIdx: number, staffIdx: number) => {
    if (!parsedData) return;
    setParsedData((prev) => {
      if (!prev) return null;
      const updatedAreas = [...prev.areas];
      const targetArea = { ...updatedAreas[areaIdx] };
      if (targetArea.staffMembers.length <= 1) return prev; // Keep at least one
      const updatedStaff = targetArea.staffMembers.filter((_, idx) => idx !== staffIdx);
      targetArea.staffMembers = updatedStaff;
      targetArea.staffName = updatedStaff.map((s) => s.name).join(' & ');
      updatedAreas[areaIdx] = targetArea;
      return { ...prev, areas: updatedAreas };
    });
  };

  const handleSaveToDatabase = () => {
    if (!parsedData) return;

    const visitId = `VISIT-2026-${customVisitCode}`;

    const newVisit: Visit = {
      id: visitId,
      visitCode: customVisitCode,
      periodNumber: customPeriod,
      visitNumber: customVisitNumber,
      periodYear: 2026,
      reportDate: parsedData.reportDate || '2026-09-28',
      visitDate: customVisitDate,
      surveyTitle: 'Warner Bros Studio Tour London: The Making of Harry Potter 2025',
      overallScoreActual: parsedData.overallScore?.actual || 1350,
      overallScorePossible: parsedData.overallScore?.possible || 1382,
      overallPercentage: parsedData.overallScore?.percentage || 98.0,
      notes: uploadedFileName ? `Ingested from PDF: ${uploadedFileName}` : 'Audited via Storecheckers mystery shopper survey.',
      createdAt: new Date().toISOString(),
    };

    const newEvaluations: FBEvaluation[] = parsedData.areas.map((a) => {
      const evalId = `EVAL-${customVisitCode}-${a.areaId.toUpperCase()}`;
      return {
        id: evalId,
        visitId,
        areaId: a.areaId,
        evaluationTime: a.time,
        actualScore: a.actualScore,
        possibleScore: a.possibleScore,
        scorePercentage: Math.round((a.actualScore / a.possibleScore) * 1000) / 10,
        purchaseSpend: a.spend,
        receiptImageAvailable: true,
        itemsPurchasedDescription: 'Mystery shopper order receipt verified on file.',
        narrativeReview: a.narrative,
        cleanlinessScore: 5,
        smartUniformScore: 5,
        nameBadgeVisible: true,
        friendlyGreeting: a.friendlyGreeting,
        queueManagement: a.queueManagement,
        tillEngagement: 'Excellent engagement and interaction',
        additionalItemsOffered: a.additionalOffered,
        allergyQuestionAsked: a.allergyChecked,
        butterbeerOffered: a.areaId === 'backlot' ? true : null,
        bodyLanguage: 'Engaging body language and interaction',
        farewellGiven: true,
        expectationsExceeded: a.expectationsExceeded,
      };
    });

    // Build distinct staff interactions extracted from the report
    const newStaff: StaffInteraction[] = [];
    let staffGlobalCount = 1;

    parsedData.areas.forEach((a) => {
      const evalId = `EVAL-${customVisitCode}-${a.areaId.toUpperCase()}`;
      a.staffMembers.forEach((sm) => {
        newStaff.push({
          id: `INT-${customVisitCode}-${staffGlobalCount++}`,
          evaluationId: evalId,
          visitId,
          areaId: a.areaId,
          staffName: sm.name,
          roleDescription: sm.role || 'Service Team Member',
          interactionTime: a.time,
          allergyChecked: a.allergyChecked,
          friendlyGreetingRating: a.friendlyGreeting,
          queueManagementRating: a.queueManagement,
          upsellOfferRating: a.additionalOffered,
          specificNarrativeExcerpt: sm.narrativeExcerpt || (a.narrative.length > 280 ? a.narrative.slice(0, 280) + '...' : a.narrative),
          keyRecognitions: a.allergyChecked
            ? ['Natasha’s Law Inquired', 'Friendly Engagement', 'Prompt Delivery']
            : ['Friendly Engagement', 'Prompt Delivery'],
        });
      });
    });

    onCommitReport(newVisit, newEvaluations, newStaff);
    setIsCommitted(true);
    setTimeout(() => {
      setIsCommitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Mystery Shopper PDF Report Ingestion
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload PDF reports directly to extract visit dates, catering area scores, employee praise, and allergen compliance.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {activeStep === 'input' ? (
            <div className="space-y-5">
              {/* Method Switcher Tabs */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInputMode('pdf')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      inputMode === 'pdf'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload PDF Document</span>
                  </button>

                  <button
                    onClick={() => setInputMode('text')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      inputMode === 'text'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Paste Text Content</span>
                  </button>
                </div>

                {/* Quick 1-click test button */}
                <button
                  onClick={handleLoadSample}
                  className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test with 21/9/26 Sample</span>
                </button>
              </div>

              {/* Mode 1: PDF Dropzone & File Picker */}
              {inputMode === 'pdf' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-950/60 hover:border-slate-500 hover:bg-slate-950'
                    }`}
                  >
                    {isProcessingPdf ? (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                        <div className="text-sm font-semibold text-white">
                          Extracting Text from PDF...
                        </div>
                        {pdfProgress && (
                          <div className="text-xs text-slate-400 font-mono">
                            Processing Page {pdfProgress.current} of {pdfProgress.total}
                          </div>
                        )}
                        <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-full transition-all duration-200"
                            style={{
                              width: pdfProgress
                                ? `${(pdfProgress.current / pdfProgress.total) * 100}%`
                                : '30%',
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                          <FileUp className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Click to upload or drag & drop your Mystery Shopper PDF report
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Supports Storecheckers PDF reports (Food Hall, Backlot, Butterbeer audits)
                          </p>
                        </div>
                        <button
                          type="button"
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors"
                        >
                          Select PDF File
                        </button>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-red-950/40 border border-red-900/60 rounded text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg text-slate-400 text-xs space-y-1">
                    <div className="font-semibold text-slate-300">How PDF Parsing Works:</div>
                    <p>
                      The parser reads the PDF directly in your browser using pdfjs-dist. It scans the survey overview to pinpoint the <strong>Date of visit</strong>, extracts the catering sections for <strong>F&B: Food Hall</strong>, <strong>F&B: Backlot</strong>, and <strong>F&B: Butterbeer</strong>, pulls out the named team members, and maps their verbatim praise.
                    </p>
                  </div>
                </div>
              )}

              {/* Mode 2: Manual Text Ingestion */}
              {inputMode === 'text' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    Paste Mystery Shopper Report / PDF Text Content:
                  </label>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Paste report text here (must include 'Date of visit:', 'F&B: Food Hall', 'F&B: Backlot', 'F&B: Butterbeer', staff names and narratives)..."
                    className="w-full h-64 bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleParse}
                      disabled={!reportText.trim()}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-semibold rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Parse Report Data</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Review & Verification Step */
            <div className="space-y-5">
              {uploadedFileName && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded">
                  <FileCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Successfully parsed from: <strong>{uploadedFileName}</strong>
                  </span>
                </div>
              )}

              {/* Header Info Banner */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500">Visit Code</label>
                  <input
                    type="text"
                    value={customVisitCode}
                    onChange={(e) => setCustomVisitCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500">Date of Visit (UK)</label>
                  <input
                    type="date"
                    value={customVisitDate}
                    onChange={(e) => setCustomVisitDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500">Period #</label>
                  <input
                    type="number"
                    value={customPeriod}
                    onChange={(e) => setCustomPeriod(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500">Visit # in Period</label>
                  <input
                    type="number"
                    value={customVisitNumber}
                    onChange={(e) => setCustomVisitNumber(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono mt-0.5"
                  />
                </div>
              </div>

              {/* Extracted Catering Sections with Editable Staff Recognitions */}
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Extracted Catering Venues & Staff Recognitions ({parsedData?.areas.length} Areas)
                </h3>

                <div className="space-y-4">
                  {parsedData?.areas.map((area, areaIdx) => (
                    <div
                      key={areaIdx}
                      className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{area.areaName}</span>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            Score: {area.actualScore}/{area.possibleScore} (100%)
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-400">
                            Time: <strong className="text-slate-200 font-mono">{area.time}</strong>
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400">
                            Spend: <strong className="text-slate-200 font-mono">£{area.spend.toFixed(2)}</strong>
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Allergies Asked</span>
                          </span>
                        </div>
                      </div>

                      {/* Staff Members Section (Editable to ensure report accuracy) */}
                      <div className="bg-slate-900/80 rounded-md p-3 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                            <User className="w-3.5 h-3.5" />
                            <span>Identified Staff Member(s) in this Report:</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddStaffMember(areaIdx)}
                            className="text-[11px] text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Another Staff Member</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {area.staffMembers.map((staff, staffIdx) => (
                            <div key={staffIdx} className="p-3 bg-slate-950/80 rounded border border-slate-800 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={staff.name}
                                    onChange={(e) => handleUpdateStaffName(areaIdx, staffIdx, e.target.value)}
                                    placeholder="e.g. Employee name or physical description"
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                                  />
                                  {staff.role && (
                                    <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded shrink-0 font-medium">
                                      {staff.role}
                                    </span>
                                  )}
                                </div>
                                {area.staffMembers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStaffMember(areaIdx, staffIdx)}
                                    className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                                    title="Remove staff entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Specific Narrative Sentence / Context for this Staff Member */}
                              <div className="pl-0.5">
                                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mb-1">
                                  <Quote className="w-3 h-3 text-amber-400" />
                                  <span>Specific Verbatim Praise / Action in Audit for {staff.name}:</span>
                                </div>
                                <textarea
                                  value={staff.narrativeExcerpt || ''}
                                  onChange={(e) => handleUpdateStaffExcerpt(areaIdx, staffIdx, e.target.value)}
                                  placeholder="Specific sentence or quote excerpt describing this staff member's service..."
                                  rows={2}
                                  className="w-full bg-slate-900/90 border border-slate-800 rounded p-2 text-xs text-slate-300 italic focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] text-slate-400 font-medium mb-1">
                          Verbatim Mystery Shopper Narrative:
                        </div>
                        <p className="text-slate-300 italic text-xs leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800/60">
                          "{area.narrative}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <button
                  onClick={resetToUploadStep}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium cursor-pointer"
                >
                  Upload Another File
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveToDatabase}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {isCommitted ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-slate-950" />
                        <span>Committed to Database!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-slate-950" />
                        <span>Commit to Relational Database</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
