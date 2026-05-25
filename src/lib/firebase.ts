import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCHzXlz_1l2VlhQgLF6IDDew2zWXkAGXKE",
  authDomain: "lmspasraman.firebaseapp.com",
  projectId: "lmspasraman",
  storageBucket: "lmspasraman.firebasestorage.app",
  messagingSenderId: "1012313883875",
  appId: "1:1012313883875:web:af67e402ac2b3f7c5bf1d6",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
