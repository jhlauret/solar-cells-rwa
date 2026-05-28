import { Outlet } from 'react-router-dom';
import { HeaderPublic } from '@/components/layout/Header/HeaderPublic';

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <HeaderPublic />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
