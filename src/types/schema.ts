/**
 * Relational Schema Types for Mystery Shopper Catering Performance Tracker
 * Adheres to standard UK English conventions and PostgreSQL data structures.
 */

export type FBAreaId = 'food_hall' | 'backlot' | 'butterbeer';

export interface FBArea {
  id: FBAreaId;
  name: string; // e.g. "F&B: Food Hall"
  shortName: string; // e.g. "Food Hall"
  maxScore: number; // e.g. 56 or 57
  description: string;
  themeColor: string;
}

export interface Visit {
  id: string; // UUID or code, e.g. "VISIT-2026-P9-V2"
  visitCode: string; // "P9-V2"
  periodNumber: number; // 9
  visitNumber: number; // 2
  periodYear: number; // 2026
  reportDate: string; // "2026-09-28" (DD/MM/YYYY displayed)
  visitDate: string; // "2026-09-21"
  surveyTitle: string; // "Warner Bros. Studio Tour London: The Making of Harry Potter"
  overallScoreActual: number; // 1350
  overallScorePossible: number; // 1382
  overallPercentage: number; // 98.0
  notes?: string;
  createdAt: string;
}

export interface FBEvaluation {
  id: string; // UUID, e.g. "EVAL-2026-P9-V2-FH"
  visitId: string;
  areaId: FBAreaId;
  evaluationTime: string; // "12:36"
  actualScore: number; // 56
  possibleScore: number; // 56
  scorePercentage: number; // 100.0
  purchaseSpend: number; // £30.00
  receiptImageAvailable: boolean;
  itemsPurchasedDescription?: string;
  narrativeReview: string; // Verbatim mystery shopper paragraph
  cleanlinessScore: number; // 5/5
  smartUniformScore: number; // 5/5
  nameBadgeVisible: boolean;
  friendlyGreeting: string; // "Exceptional", "Friendly", etc.
  queueManagement: string; // "Full care", "Good care", etc.
  tillEngagement: string; // "Excellent engagement and interaction"
  additionalItemsOffered: string; // "Great amount of extra info or help"
  allergyQuestionAsked: boolean; // Natasha's law & allergy check compliance
  butterbeerOffered?: boolean | null; // Specific to Backlot evaluation
  bodyLanguage: string; // "Engaging body language and interaction"
  farewellGiven: boolean;
  expectationsExceeded: string; // "Amazing", "Good", etc.
}

export interface StaffInteraction {
  id: string;
  evaluationId: string;
  visitId: string;
  areaId: FBAreaId;
  staffName: string; // "Essel", "Daniella", "Hannah" or descriptive string
  roleDescription?: string;
  interactionTime: string;
  allergyChecked: boolean;
  friendlyGreetingRating: string;
  queueManagementRating: string;
  upsellOfferRating: string;
  specificNarrativeExcerpt: string;
  keyRecognitions: string[]; // ["Allergy Vigilant", "Speed of Service", "Warm Welcome"]
}

export interface StaffMemberSummary {
  name: string;
  areaId: FBAreaId;
  areaName: string;
  totalMentions: number;
  latestVisitDate: string;
  latestPeriod: string;
  avgGreeting: string;
  allergyComplianceCount: number;
  highlightNarrative: string;
  badges: string[];
}
