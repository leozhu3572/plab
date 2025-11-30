import {
  logEvent as firebaseLogEvent,
  getAnalytics,
  setUserId,
  setUserProperties,
} from "firebase/analytics";
import * as firebaseApp from "firebase/app";
import {
  signOut as firebaseSignOut,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { Case } from "../types";

// Firebase config is sourced from environment variables (Vite uses the VITE_ prefix).
// Keep secrets out of the codebase; see .env.local.example for expected keys.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize only if config is valid-ish to avoid immediate crash on load,
// though it will fail on Auth actions if invalid.
const app = firebaseApp.initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics must be initialized client-side only (not during SSR or build)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Authentication Functions
export const signIn = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error signing in", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

// Database Functions
export const subscribeToCases = (callback: (cases: Case[]) => void) => {
  if (!auth.currentUser) return () => {};

  // Create a reference to the user's specific sub-collection
  const q = query(
    collection(db, "users", auth.currentUser.uid, "cases"),
    orderBy("lastUpdated", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const cases = snapshot.docs.map((doc) => doc.data() as Case);
      callback(cases);
    },
    (error) => {
      console.error("Error fetching cases:", error);
    }
  );
};

export const saveCaseToFirestore = async (caseData: Case) => {
  if (!auth.currentUser) throw new Error("User not authenticated");

  // Save to /users/{uid}/cases/{caseId}
  await setDoc(
    doc(db, "users", auth.currentUser.uid, "cases", caseData.id),
    caseData
  );
};

export const deleteCaseFromFirestore = async (caseId: string) => {
  if (!auth.currentUser) throw new Error("User not authenticated");

  await deleteDoc(doc(db, "users", auth.currentUser.uid, "cases", caseId));
};

// Analytics Functions
export const logEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (!analytics) {
    console.warn("Analytics not initialized (likely running server-side)");
    return;
  }
  try {
    console.log("Logging analytics event:", eventName, eventParams);
    firebaseLogEvent(analytics, eventName, eventParams);
  } catch (error) {
    console.error("Error logging analytics event:", error);
  }
};

export const setAnalyticsUserId = (userId: string) => {
  if (!analytics) {
    console.warn("Analytics not initialized (likely running server-side)");
    return;
  }
  try {
    setUserId(analytics, userId);
  } catch (error) {
    console.error("Error setting analytics user ID:", error);
  }
};

export const setAnalyticsUserProperties = (properties: Record<string, any>) => {
  if (!analytics) {
    console.warn("Analytics not initialized (likely running server-side)");
    return;
  }
  try {
    setUserProperties(analytics, properties);
  } catch (error) {
    console.error("Error setting analytics user properties:", error);
  }
};
