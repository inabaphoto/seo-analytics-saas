'use client';

import { UserNav } from '@/components/dashboard/user-nav';
import { useAuth } from '@/components/providers/auth-provider';

export function DashboardHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">ダッシュボード</h1>
        </div>
        <div className="flex items-center space-x-4">
          <UserNav
            user={{
              name: user?.user_metadata?.full_name || user?.email,
              email: user?.email,
              avatar: user?.user_metadata?.avatar_url,
            }}
          />
        </div>
      </div>
    </header>
  );
}
