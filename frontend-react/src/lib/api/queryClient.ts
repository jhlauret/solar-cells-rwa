import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           30_000,      // 30 s avant de considérer stale
      gcTime:              5 * 60_000,  // 5 min en cache
      retry:               2,
      retryDelay:          (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect:  true,
    },
    mutations: {
      retry: 0,
    },
  },
});
