import { Visit, FBEvaluation, StaffInteraction } from '../types/schema';

/**
 * Robust extractor for period (month number 1-12) and visit number (1, 2, ...)
 * Handles both explicit schema properties and visitCode conventions (e.g. "P1-V1", "P4-V2").
 */
export function extractPeriodAndVisitNumber(v?: Visit | null): { year: number; period: number; visit: number } {
  if (!v) return { year: 0, period: 0, visit: 0 };

  // 1. Year
  let year = v.periodYear || 0;
  if (!year && v.visitDate) {
    const y = parseInt(v.visitDate.slice(0, 4), 10);
    if (!isNaN(y)) year = y;
  }

  // 2. Period & Visit
  let period = v.periodNumber || 0;
  let visit = v.visitNumber || 0;

  if (v.visitCode) {
    const match = v.visitCode.match(/P(\d+)[-_ ]?V(\d+)/i);
    if (match) {
      if (!period) period = parseInt(match[1], 10);
      if (!visit) visit = parseInt(match[2], 10);
    }
  }

  // Fallback period from visitDate month
  if (!period && v.visitDate) {
    const parts = v.visitDate.split('-');
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      if (!isNaN(m)) period = m;
    }
  }

  return { year, period, visit };
}

/**
 * Standard comparator to order visits strictly by:
 * 1. Year (periodYear or calendar year)
 * 2. Period (month 1-12 from periodNumber or visitDate)
 * 3. Visit number (Visit 1, then Visit 2)
 * 4. Fallback to calendar date timestamp
 * 5. Stable fallback by visit code
 */
export function compareVisitsByYearPeriodVisit(
  a?: Visit | null,
  b?: Visit | null,
  direction: 'asc' | 'desc' = 'asc'
): number {
  if (!a && !b) return 0;
  if (!a) return direction === 'asc' ? 1 : -1;
  if (!b) return direction === 'asc' ? -1 : 1;

  const dir = direction === 'asc' ? 1 : -1;

  const metaA = extractPeriodAndVisitNumber(a);
  const metaB = extractPeriodAndVisitNumber(b);

  // 1. Year comparison
  if (metaA.year !== metaB.year) {
    return (metaA.year - metaB.year) * dir;
  }

  // 2. Period (calendar month number: 1 to 12)
  if (metaA.period !== metaB.period) {
    return (metaA.period - metaB.period) * dir;
  }

  // 3. Visit number within the period (Visit 1 before Visit 2)
  if (metaA.visit !== metaB.visit) {
    return (metaA.visit - metaB.visit) * dir;
  }

  // 4. Fallback to calendar date timestamp
  const dateA = a.visitDate ? new Date(a.visitDate).getTime() : 0;
  const dateB = b.visitDate ? new Date(b.visitDate).getTime() : 0;
  if (dateA !== dateB) {
    return (dateA - dateB) * dir;
  }

  // 5. Stable fallback by visit code
  return (a.visitCode || '').localeCompare(b.visitCode || '') * dir;
}

/**
 * Returns a sorted copy of the given visits array.
 */
export function sortVisits(
  visits: Visit[],
  direction: 'asc' | 'desc' = 'asc'
): Visit[] {
  return [...visits].sort((a, b) => compareVisitsByYearPeriodVisit(a, b, direction));
}

/**
 * Area ordering priority for clean, logical display within the same audit visit
 */
const CATERING_AREA_ORDER: Record<string, number> = {
  food_hall: 1,
  backlot: 2,
  butterbeer: 3,
};

/**
 * Compares two evaluations strictly by parent visit's year, period (month), and visit number,
 * falling back to department area within the visit.
 */
export function compareEvaluationsByYearPeriodVisit(
  evalA: FBEvaluation,
  evalB: FBEvaluation,
  visitMap: Map<string, Visit>,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const visitA = visitMap.get(evalA.visitId);
  const visitB = visitMap.get(evalB.visitId);

  // Compare parent visits
  const visitCmp = compareVisitsByYearPeriodVisit(visitA, visitB, direction);
  if (visitCmp !== 0) {
    return visitCmp;
  }

  // If both evaluations belong to the same audit visit, order by area (Food Hall -> Backlot -> Butterbeer)
  const areaOrderA = CATERING_AREA_ORDER[evalA.areaId] ?? 99;
  const areaOrderB = CATERING_AREA_ORDER[evalB.areaId] ?? 99;
  return (areaOrderA - areaOrderB) * (direction === 'asc' ? 1 : -1);
}

/**
 * Compares staff interactions strictly by parent visit's year, period (month), and visit number.
 */
export function compareStaffByYearPeriodVisit(
  staffA: StaffInteraction,
  staffB: StaffInteraction,
  visitMap: Map<string, Visit>,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const visitA = visitMap.get(staffA.visitId);
  const visitB = visitMap.get(staffB.visitId);

  const visitCmp = compareVisitsByYearPeriodVisit(visitA, visitB, direction);
  if (visitCmp !== 0) {
    return visitCmp;
  }

  // Within the same visit, order by time or staff name
  if (staffA.interactionTime && staffB.interactionTime) {
    return staffA.interactionTime.localeCompare(staffB.interactionTime) * (direction === 'asc' ? 1 : -1);
  }

  return (staffA.staffName || '').localeCompare(staffB.staffName || '') * (direction === 'asc' ? 1 : -1);
}
