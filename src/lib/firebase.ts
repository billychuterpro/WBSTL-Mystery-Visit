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
  const q = query(collection(db, COLLECTIONS.VISITS), orderBy('visitDate', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Visit[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Visit);
      });
      onData(list);
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

// 8. Ensure database is initialized with baseline audit data if completely empty
export async function ensureDatabaseInitialized(): Promise<void> {
  try {
    const visitsQuery = query(collection(db, COLLECTIONS.VISITS), limit(1));
    const snap = await getDocs(visitsQuery);
    if (snap.empty) {
      console.log('Database empty, seeding full 2026 mystery shopper dataset (9 visits, 27 evaluations, 33 staff interactions)...');
      const batch = writeBatch(db);
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
      console.log('2026 audit dataset successfully seeded into Firestore.');
    }
  } catch (error) {
    console.warn('Error checking or seeding baseline data in Firestore:', error);
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

// 10. Clear all database records completely
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
