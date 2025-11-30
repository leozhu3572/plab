import * as firebaseApp from 'firebase/app';
import { signOut as firebaseSignOut, getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, deleteDoc, doc, getFirestore, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { Case } from '../types';

// Firebase config is sourced from environment variables (Vite uses the VITE_ prefix).
// Keep secrets out of the codebase; see .env.local.example for expected keys.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize only if config is valid-ish to avoid immediate crash on load, 
// though it will fail on Auth actions if invalid.
const app = firebaseApp.initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

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
    collection(db, 'users', auth.currentUser.uid, 'cases'), 
    orderBy('lastUpdated', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const cases = snapshot.docs.map(doc => doc.data() as Case);
    callback(cases);
  }, (error) => {
      console.error("Error fetching cases:", error);
  });
};

export const saveCaseToFirestore = async (caseData: Case) => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  // Save to /users/{uid}/cases/{caseId}
  await setDoc(doc(db, 'users', auth.currentUser.uid, 'cases', caseData.id), caseData);
};

export const deleteCaseFromFirestore = async (caseId: string) => {
    if (!auth.currentUser) throw new Error("User not authenticated");
    
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'cases', caseId));
};
