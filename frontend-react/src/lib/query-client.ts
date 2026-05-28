import { QueryClient } from '@tanstack/react-query';
import { ApiError }    from './api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Données considérées "fraîches" pendant 2 minutes
      staleTime:          2 * 60 * 1000,
      // Garde les données en cache 5 minutes après que le composant se démonte
      gcTime:             5 * 60 * 1000,
      // Retry uniquement sur les erreurs réseau, pas sur les 4xx
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status && error.status < 500) {
          return false;   // 4xx → pas de retry
        }
        return failureCount < 2;
      },
      // Refetch sur focus onglet seulement en production
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      retry: false,
    },
  },
});
