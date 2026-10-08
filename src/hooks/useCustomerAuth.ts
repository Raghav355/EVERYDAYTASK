import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type CustomerUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
};

function extractUser(session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null): CustomerUser | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    fullName: (meta.full_name as string) ?? '',
    phone: (meta.phone as string) ?? '',
  };
}

export function useCustomerAuth() {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(extractUser(session));
      setLoading(false);
    }

    void checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!mounted) return;
        setUser(extractUser(session));
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, fullName: string, phone: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return { user, loading, signIn, signUp, signOut };
}
