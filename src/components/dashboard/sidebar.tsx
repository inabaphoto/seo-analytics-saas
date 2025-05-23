'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'ダッシュボード',
  },
  {
    href: '/dashboard/reports',
    icon: BarChart2,
    label: 'レポート',
  },
  {
    href: '/dashboard/settings',
    icon: Settings,
    label: '設定',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden h-screen w-64 border-r bg-white md:block">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-semibold">SEO Analytics</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5',
                    isActive ? 'text-gray-900' : 'text-gray-500',
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
