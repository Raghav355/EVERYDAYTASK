import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AdminProfile } from '@/types';

export function useAdminAuth() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !mounted) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('admin_profiles')
        .select('id, role, full_name')
        .eq('id', session.user.id)
        .maybeSingle();
      if (mounted) {
        setAdmin((data as AdminProfile) ?? null);
        setLoading(false);
      }
    }

    void checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session) {
          if (mounted) { setAdmin(null); setLoading(false); }
          return;
        }
        const { data } = await supabase
          .from('admin_profiles')
          .select('id, role, full_name')
          .eq('id', session.user.id)
          .maybeSingle();
        if (mounted) {
          setAdmin((data as AdminProfile) ?? null);
          setLoading(false);
        }
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

  async function signOut() {
    await supabase.auth.signOut();
    setAdmin(null);
  }

  return { admin, loading, signIn, signOut };
}
