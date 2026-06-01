import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApps()[0];
  if (!firebaseConfig.apiKey) {
    console.warn("Firebase config missing — set NEXT_PUBLIC_FIREBASE_* env vars");
  }
  return initializeApp(firebaseConfig);
}

export const app = getFirebaseApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function initAnalytics() {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  return supported ? getAnalytics(app) : null;
}
