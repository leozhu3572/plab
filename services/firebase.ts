import * as firebaseApp from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Case } from '../types';

// ------------------------------------------------------------------
// 🔴 IMPORTANT: REPLACE THE OBJECT BELOW WITH YOUR OWN FIREBASE CONFIG
// 1. Go to console.firebase.google.com
// 2. Open your project > Project Settings > General > Your Apps > Web
// 3. Copy the firebaseConfig object and paste it below
// ------------------------------------------------------------------
const firebaseConfig = {
  // Example Placeholder - REPLACE THESE VALUES
  apiKey: "AIzaSyDvfEvR4_2nff-X2w0cQwsvRTGHWLJokbM",
  authDomain: "pressure-lab.firebaseapp.com",
  projectId: "pressure-lab",
  storageBucket: "pressure-lab.firebasestorage.app",
  messagingSenderId: "921329523682",
  appId: "1:921329523682:web:a58ab371f215f0f9cef7bb",
  measurementId: "G-RWMZKCN0FP"
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