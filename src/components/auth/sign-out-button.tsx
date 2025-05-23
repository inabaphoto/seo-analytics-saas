'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const { signOut } = useAuth();

  return (
    <Button
      variant="ghost"
      onClick={signOut}
      className={cn('flex w-full items-center justify-start gap-2', className)}
    >
      <LogOut className="h-4 w-4" />
      ログアウト
    </Button>
  );
}
