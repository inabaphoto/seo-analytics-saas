import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">ダッシュボードへようこそ</h2>
      <p className="mt-2 text-gray-600">
        左のメニューから操作を選択してください。
      </p>
    </div>
  );
}
