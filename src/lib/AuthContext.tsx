'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AppRole = 'student' | 'teacher' | 'admin';

export interface LmsUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: LmsUser | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signIn: async () => {},
  logout: async () => {},
});

function normalizeUser(user: User | null): LmsUser | null {
  if (!user) return null;
  const displayName =
    typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name :
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name :
    user.email?.split('@')[0] ?? null;

  return {
    id: user.id,
    uid: user.id,
    email: user.email ?? null,
    displayName,
  };
}

async function ensureAppUser(user: User): Promise<AppRole | null> {
  const { data: existing, error: selectError } = await supabase
    .from('app_users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) console.error('app_users select failed:', selectError);
  if (existing?.role) return existing.role as AppRole;

  // User not in app_users yet — likely a new Google login
  // Auto-register as student for now
  const email = user.email ?? `${user.id}@unknown.local`;
  const username = email.split('@')[0];
  const displayName =
    typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name :
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name :
    username;

  const { data, error } = await supabase
    .from('app_users')
    .insert({
      id: user.id,
      email,
      username,
      display_name: displayName,
      role: 'student',
    })
    .select('role')
    .single();

  if (error) {
    console.error('app_users insert failed:', error);
    return null;
  }

  return (data?.role as AppRole) ?? 'student';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LmsUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadInitialSession() {
      const { data } = await supabase.auth.getSession();
      const supabaseUser = data.session?.user ?? null;
      if (!active) return;
      setUser(normalizeUser(supabaseUser));
      // Don't await ensureAppUser — it's a REST call that can be slow
      // when supabase-js auto-refreshes an expired token on mobile.
      // setLoading(false) must fire immediately so the UI isn't stuck
      // on a loading spinner while auth-dependent queries resolve.
      if (supabaseUser) {
        ensureAppUser(supabaseUser).then(r => { if (active) setRole(r); });
      } else {
        setRole(null);
      }
      if (active) setLoading(false);
    }

    loadInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const supabaseUser = session?.user ?? null;
      setUser(normalizeUser(supabaseUser));
      if (supabaseUser) {
        ensureAppUser(supabaseUser).then(r => { if (active) setRole(r); });
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (username: string, password: string) => {
    // Resolve username → email via RPC (bcrypt-verified)
    const { verifyUsernamePassword } = await import('@/lib/supabase-data');
    const result = await verifyUsernamePassword(username, password);
    if (!result) throw new Error('Username atau password salah');
    const { error } = await supabase.auth.signInWithPassword({ email: result.email, password });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
