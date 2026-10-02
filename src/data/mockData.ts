import { FBArea, Visit, FBEvaluation, StaffInteraction } from '../types/schema';
import { ALL_NINE_VISITS } from './allAuditsData';
import { ALL_TWENTY_SEVEN_EVALUATIONS } from './allEvaluationsData';
import { ALL_STAFF_INTERACTIONS } from './allStaffData';

export const FB_AREAS: Record<string, FBArea> = {
  food_hall: {
    id: 'food_hall',
    name: 'F&B: Food Hall',
    shortName: 'Food Hall',
    maxScore: 56,
    description: 'Main dining hall at the beginning of the tour serving rotisserie chicken, roasts, burgers, and hot meals.',
    themeColor: '#D97706', // Amber gold
  },
  backlot: {
    id: 'backlot',
    name: 'F&B: Backlot',
    shortName: 'Backlot',
    maxScore: 57,
    description: 'Midway outdoor pavilion cafe offering burgers, wings, loaded fries, and draft Butterbeer.',
    themeColor: '#2563EB', // Blue
  },
  butterbeer: {
    id: 'butterbeer',
    name: 'F&B: Butterbeer',
    shortName: 'Butterbeer',
    maxScore: 56,
    description: 'Specialist beverage bar serving frothy Butterbeer, Butterbeer latte, and souvenir tankard ice cream.',
    themeColor: '#059669', // Emerald
  },
};

/**
 * Complete 2026 Storecheckers Mystery Shopper Audits:
 * 9 Physical Audits across Periods 4 to 9 (P4-V1 through P9-V2)
 * 27 Venue Section Evaluations
 * 33 Named Staff Interaction Records
 */
export const INITIAL_VISITS: Visit[] = ALL_NINE_VISITS;
export const INITIAL_EVALUATIONS: FBEvaluation[] = ALL_TWENTY_SEVEN_EVALUATIONS;
export const INITIAL_STAFF_INTERACTIONS: StaffInteraction[] = ALL_STAFF_INTERACTIONS;
