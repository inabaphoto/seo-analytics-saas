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

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // ログイン成功時にダッシュボードにリダイレクト
      if (event === 'SIGNED_IN') {
        // 初期ユーザー登録処理
        if (session?.user) {
          try {
            await handleNewUser(session.user);
          } catch (error) {
            console.error('新規ユーザー登録中にエラーが発生しました:', error);
          }
        }
        router.push('/dashboard');
      }

      // ログアウト時にログインページにリダイレクト
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleNewUser = async (user: User) => {
    // 新規ユーザーの初期登録処理
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingUser && user.email) {
        // テナント作成
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: `${user.user_metadata.full_name || user.email}'s Team`,
            plan: 'free',
          })
          .select()
          .single();

        if (tenantError) {
          console.error('テナント作成エラー:', tenantError);
          throw new Error('テナントの作成に失敗しました');
        }

        // ユーザー作成
        const { error: userError } = await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata.full_name || user.email.split('@')[0],
          role: 'admin',
          tenant_id: newTenant.id,
        });

        if (userError) {
          console.error('ユーザー作成エラー:', userError);
          throw new Error('ユーザーの作成に失敗しました');
        }
      }
    } catch (error) {
      console.error('ユーザー登録処理エラー:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
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
    throw new Error('useAuth は AuthProvider 内で使用する必要があります');
  }
  return context;
};
