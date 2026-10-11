import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDocFromServer,
  onSnapshot,
  writeBatch,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Visit, FBEvaluation, StaffInteraction } from '../types/schema';
import { INITIAL_VISITS, INITIAL_EVALUATIONS, INITIAL_STAFF_INTERACTIONS } from '../data/mockData';
import { sortVisits } from '../utils/sortUtils';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying the firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check using dedicated test path
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline cache mode.');
      return false;
    }
    return true;
  }
}

// Collection names
export const COLLECTIONS = {
  VISITS: 'visits',
  EVALUATIONS: 'evaluations',
  STAFF_INTERACTIONS: 'staffInteractions',
};

// 1. Subscribe to Visits
export function subscribeVisits(
  onData: (visits: Visit[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.VISITS));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Visit[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Visit);
      });
      // Ensure all visits are sorted strictly by year, period (month), and visit number
      const sorted = sortVisits(list, 'asc');
      onData(sorted);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.VISITS);
      if (onError) onError(error);
    }
  );
}

// 2. Subscribe to Evaluations
export function subscribeEvaluations(
  onData: (evaluations: FBEvaluation[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.EVALUATIONS));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: FBEvaluation[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as FBEvaluation);
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.EVALUATIONS);
      if (onError) onError(error);
    }
  );
}

// 3. Subscribe to Staff Interactions
export function subscribeStaffInteractions(
  onData: (staff: StaffInteraction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.STAFF_INTERACTIONS));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: StaffInteraction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StaffInteraction);
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.STAFF_INTERACTIONS);
      if (onError) onError(error);
    }
  );
}

// 4. Save new Visit with all associated Evaluations and Staff Interactions in an atomic batch
export async function saveVisitWithEvaluationsAndStaff(
  visit: Visit,
  evaluations: FBEvaluation[],
  staff: StaffInteraction[]
): Promise<void> {
  const batch = writeBatch(db);

  try {
    // Visit document
    const visitRef = doc(db, COLLECTIONS.VISITS, visit.id);
    batch.set(visitRef, visit);

    // Evaluation documents
    evaluations.forEach((evaluation) => {
      const evalRef = doc(db, COLLECTIONS.EVALUATIONS, evaluation.id);
      batch.set(evalRef, evaluation);
    });

    // Staff Interaction documents
    staff.forEach((item) => {
      const staffRef = doc(db, COLLECTIONS.STAFF_INTERACTIONS, item.id);
      batch.set(staffRef, item);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.VISITS);
  }
}

// 5. Update a single staff interaction directly in Firestore
export async function updateStaffInteraction(item: StaffInteraction): Promise<void> {
  try {
    const staffRef = doc(db, COLLECTIONS.STAFF_INTERACTIONS, item.id);
    await setDoc(staffRef, item, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.STAFF_INTERACTIONS}/${item.id}`);
  }
}

// 6. Delete a single staff interaction directly from Firestore
export async function deleteStaffInteraction(staffId: string): Promise<void> {
  try {
    const staffRef = doc(db, COLLECTIONS.STAFF_INTERACTIONS, staffId);
    await deleteDoc(staffRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.STAFF_INTERACTIONS}/${staffId}`);
  }
}

// 7. Delete a Visit and cascade delete its evaluations and staff records
export async function deleteVisitAndCascade(visitId: string): Promise<void> {
  const batch = writeBatch(db);

  try {
    // 1. Delete visit
    const visitRef = doc(db, COLLECTIONS.VISITS, visitId);
    batch.delete(visitRef);

    // 2. Query and delete associated evaluations
    const evalQuery = query(collection(db, COLLECTIONS.EVALUATIONS), where('visitId', '==', visitId));
    const evalSnap = await getDocs(evalQuery);
    evalSnap.forEach((d) => batch.delete(d.ref));

    // 3. Query and delete associated staff interactions
    const staffQuery = query(collection(db, COLLECTIONS.STAFF_INTERACTIONS), where('visitId', '==', visitId));
    const staffSnap = await getDocs(staffQuery);
    staffSnap.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.VISITS);
  }
}

// 7b. Delete a single evaluation and its associated staff records
export async function deleteEvaluation(evaluationId: string): Promise<void> {
  const batch = writeBatch(db);

  try {
    const evalRef = doc(db, COLLECTIONS.EVALUATIONS, evaluationId);
    batch.delete(evalRef);

    const staffQuery = query(
      collection(db, COLLECTIONS.STAFF_INTERACTIONS),
      where('evaluationId', '==', evaluationId)
    );
    const staffSnap = await getDocs(staffQuery);
    staffSnap.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.EVALUATIONS}/${evaluationId}`);
  }
}

// 8. Ensure database is initialized
export async function ensureDatabaseInitialized(): Promise<void> {
  try {
    const visitsSnap = await getDocs(collection(db, COLLECTIONS.VISITS));
    if (visitsSnap.empty) {
      await resetDatabaseToProvidedReport();
    }
  } catch (error) {
    console.warn('Firestore initialization check:', error);
  }
}

// 9. Reset database to the comprehensive 2026 audit dataset (9 visits)
export async function resetDatabaseToProvidedReport(): Promise<void> {
  await clearAllDatabaseRecords();
  const batch = writeBatch(db);

  try {
    INITIAL_VISITS.forEach((v) => {
      batch.set(doc(db, COLLECTIONS.VISITS, v.id), v);
    });
    INITIAL_EVALUATIONS.forEach((e) => {
      batch.set(doc(db, COLLECTIONS.EVALUATIONS, e.id), e);
    });
    INITIAL_STAFF_INTERACTIONS.forEach((s) => {
      batch.set(doc(db, COLLECTIONS.STAFF_INTERACTIONS, s.id), s);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'reset_initial_data');
  }
}

export const resetDatabaseToFull2026Dataset = resetDatabaseToProvidedReport;

// 10. Update a single evaluation record directly in Firestore
export async function updateEvaluation(evaluation: FBEvaluation): Promise<void> {
  try {
    const evalRef = doc(db, COLLECTIONS.EVALUATIONS, evaluation.id);
    await setDoc(evalRef, evaluation, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.EVALUATIONS}/${evaluation.id}`);
  }
}

// 11. Clear all database records completely
export async function clearAllDatabaseRecords(): Promise<void> {
  try {
    const batch = writeBatch(db);

    const [visitsSnap, evalsSnap, staffSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.VISITS)),
      getDocs(collection(db, COLLECTIONS.EVALUATIONS)),
      getDocs(collection(db, COLLECTIONS.STAFF_INTERACTIONS)),
    ]);

    visitsSnap.forEach((d) => batch.delete(d.ref));
    evalsSnap.forEach((d) => batch.delete(d.ref));
    staffSnap.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'clear_all');
  }
}

// 12. Clear visits and associated records by visitCode (e.g. 'P4-V1') and restore clean baseline record
export async function clearAndResetVisitByCode(targetCode: string): Promise<void> {
  const batch = writeBatch(db);

  try {
    const visitsQuery = query(collection(db, COLLECTIONS.VISITS), where('visitCode', '==', targetCode));
    const visitsSnap = await getDocs(visitsQuery);
    
    const visitIdsToDelete = new Set<string>();
    visitsSnap.forEach((d) => {
      visitIdsToDelete.add(d.id);
      batch.delete(d.ref);
    });

    const evalsQuery = query(collection(db, COLLECTIONS.EVALUATIONS));
    const evalsSnap = await getDocs(evalsQuery);
    evalsSnap.forEach((d) => {
      const data = d.data() as FBEvaluation;
      if (visitIdsToDelete.has(data.visitId) || data.id.includes(`-${targetCode}-`)) {
        batch.delete(d.ref);
      }
    });

    const staffQuery = query(collection(db, COLLECTIONS.STAFF_INTERACTIONS));
    const staffSnap = await getDocs(staffQuery);
    staffSnap.forEach((d) => {
      const data = d.data() as StaffInteraction;
      if (visitIdsToDelete.has(data.visitId) || data.id.includes(`-${targetCode}-`)) {
        batch.delete(d.ref);
      }
    });

    const baselineVisit = INITIAL_VISITS.find((v) => v.visitCode === targetCode);
    if (baselineVisit) {
      batch.set(doc(db, COLLECTIONS.VISITS, baselineVisit.id), baselineVisit);
      INITIAL_EVALUATIONS.filter((e) => e.visitId === baselineVisit.id).forEach((e) => {
        batch.set(doc(db, COLLECTIONS.EVALUATIONS, e.id), e);
      });
      INITIAL_STAFF_INTERACTIONS.filter((s) => s.visitId === baselineVisit.id).forEach((s) => {
        batch.set(doc(db, COLLECTIONS.STAFF_INTERACTIONS, s.id), s);
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.VISITS);
  }
}

// 13. Update or reallocate visit details (date, period, visit number, code, year) and cascade to child records
export async function updateVisitDetails(
  oldVisitId: string,
  updatedVisit: Visit
): Promise<void> {
  const batch = writeBatch(db);

  try {
    const isNewId = oldVisitId !== updatedVisit.id;

    if (isNewId) {
      // 1. Delete old visit doc, create new visit doc
      batch.delete(doc(db, COLLECTIONS.VISITS, oldVisitId));
      batch.set(doc(db, COLLECTIONS.VISITS, updatedVisit.id), updatedVisit);

      // 2. Query all evaluations with visitId == oldVisitId
      const evalsQuery = query(
        collection(db, COLLECTIONS.EVALUATIONS),
        where('visitId', '==', oldVisitId)
      );
      const evalsSnap = await getDocs(evalsQuery);
      evalsSnap.forEach((d) => {
        const evalData = d.data() as FBEvaluation;
        batch.delete(d.ref);
        const newEvalId = `EVAL-${updatedVisit.periodYear}-${updatedVisit.visitCode}-${evalData.areaId.toUpperCase()}`;
        batch.set(doc(db, COLLECTIONS.EVALUATIONS, newEvalId), {
          ...evalData,
          id: newEvalId,
          visitId: updatedVisit.id,
        });
      });

      // 3. Query all staff interactions with visitId == oldVisitId
      const staffQuery = query(
        collection(db, COLLECTIONS.STAFF_INTERACTIONS),
        where('visitId', '==', oldVisitId)
      );
      const staffSnap = await getDocs(staffQuery);
      let staffCounter = 1;
      staffSnap.forEach((d) => {
        const staffData = d.data() as StaffInteraction;
        batch.delete(d.ref);
        const newStaffId = `INT-${updatedVisit.periodYear}-${updatedVisit.visitCode}-${staffCounter++}`;
        const newEvalId = `EVAL-${updatedVisit.periodYear}-${updatedVisit.visitCode}-${staffData.areaId.toUpperCase()}`;
        batch.set(doc(db, COLLECTIONS.STAFF_INTERACTIONS, newStaffId), {
          ...staffData,
          id: newStaffId,
          visitId: updatedVisit.id,
          evaluationId: newEvalId,
        });
      });
    } else {
      batch.set(doc(db, COLLECTIONS.VISITS, updatedVisit.id), updatedVisit, { merge: true });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.VISITS);
  }
}
