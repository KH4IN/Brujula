import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseConfigured = Object.values(config).every(Boolean);
const auth = firebaseConfigured ? getAuth(getApps().length ? getApp() : initializeApp(config)) : null;

// Supabase issues the session used by the existing UUID-based RLS policies.
export async function googleIdTokenFromFirebase(): Promise<string> {
  if (!auth) throw new Error('Firebase no está configurado.');
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  const token = GoogleAuthProvider.credentialFromResult(result)?.idToken;
  if (!token) {
    await signOut(auth);
    throw new Error('Google no devolvió un token de identidad.');
  }
  return token;
}

export async function disconnectFirebase() {
  if (auth?.currentUser) await signOut(auth);
}
