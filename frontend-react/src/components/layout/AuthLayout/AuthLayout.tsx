import { Outlet } from 'react-router-dom';
import { HeaderAuth } from '@/components/layout/Header/HeaderAuth';

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <HeaderAuth />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
