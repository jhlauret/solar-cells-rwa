import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient }  from '@/lib/api/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppRouter }    from '@/routes';

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
