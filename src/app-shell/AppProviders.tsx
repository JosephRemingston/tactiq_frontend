import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { ApiError } from '@/api/errors';
import { OverlayHost } from '@/ui/overlay';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        // Client errors are final; retry only network and 5xx failures, never 401/403/404/409/429.
        retry: (count, err) => {
          if (err instanceof ApiError && err.status > 0 && err.status < 500) return false;
          return count < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

export const queryClientRef: { current: QueryClient | null } = { current: null };

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const qc = makeClient();
    queryClientRef.current = qc;
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      <OverlayHost>{children}</OverlayHost>
    </QueryClientProvider>
  );
}
