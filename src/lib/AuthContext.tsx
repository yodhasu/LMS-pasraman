'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  role: 'student' | 'teacher' | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  linkGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasGoogleLinked: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  linkGoogle: async () => {},
  logout: async () => {},
  hasGoogleLinked: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasGoogleLinked, setHasGoogleLinked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check Google link
        setHasGoogleLinked(
          firebaseUser.providerData.some((p) => p.providerId === 'google.com')
        );

        // Get role from claims or Firestore
        const token = await firebaseUser.getIdTokenResult();
        let userRole = token.claims.role as string | undefined;
        if (!userRole) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) userRole = userDoc.data().role;
        }
        setRole((userRole as 'student' | 'teacher') || null);

        // Ensure Firestore doc exists for new users
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            username: firebaseUser.email?.split('@')[0] || 'user',
            displayName: firebaseUser.displayName || 'Siswa',
            role: 'student',
            googleLinked: true,
            nilai: {},
          });
        }
      } else {
        setRole(null);
        setHasGoogleLinked(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async (username: string, password: string) => {
    const email = username.includes('@') ? username : `${username}@pasraman.id`;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const linkGoogle = async () => {
    if (!user) return;
    const provider = new GoogleAuthProvider();
    await linkWithPopup(user, provider);
    setHasGoogleLinked(true);
    await setDoc(doc(db, 'users', user.uid), { googleLinked: true }, { merge: true });
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, signIn, signInWithGoogle, linkGoogle, logout, hasGoogleLinked }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
