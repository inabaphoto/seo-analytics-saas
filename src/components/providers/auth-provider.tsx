'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // 開発環境での認証スキップ設定
  const isDevelopment = process.env.NODE_ENV === 'development';
  const skipAuth = isDevelopment && process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';

  useEffect(() => {
    // 開発環境で認証をスキップする場合
    if (skipAuth) {
      console.log(' AuthProvider: ');
      // 
      const mockUser: User = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        aud: 'authenticated',
        app_metadata: {},
        user_metadata: { full_name: '' },
      };
      const mockSession: Session = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser,
      };
      setSession(mockSession);
      setUser(mockUser);
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // 
      if (event === 'SIGNED_IN') {
        // 
        if (session?.user) {
          try {
            await handleNewUser(session.user);
          } catch (error) {
            console.error(':', error);
          }
        }
        router.push('/');
      }

      // 
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase, skipAuth]);

  const handleNewUser = async (user: User) => {
    // 
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingUser && user.email) {
        // 
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: `${user.user_metadata.full_name || user.email}'s Team`,
            plan: 'free',
          })
          .select()
          .single();

        if (tenantError) {
          console.error(': ', tenantError);
          throw new Error('');
        }

        // 
        const { error: userError } = await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata.full_name || user.email.split('@')[0],
          role: 'admin',
          tenant_id: newTenant.id,
        });

        if (userError) {
          console.error(': ', userError);
          throw new Error('');
        }
      }
    } catch (error) {
      console.error(': ', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // 
      if (skipAuth) {
        console.log(' AuthProvider: ');
        return;
      }
      
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error(': ', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth ');
  }
  return context;
};
