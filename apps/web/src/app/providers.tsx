"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${API_URL}/trpc`,
          headers() {
            if (typeof window === "undefined") return {};
            // Extract eventId from URL: /event/<eventId> or /event/<eventId>/...
            const match = window.location.pathname.match(/\/event\/([^/]+)/);
            if (match?.[1]) {
              const token = localStorage.getItem(`taskpool:token:${match[1]}`);
              if (token) return { Authorization: `Bearer ${token}` };
            }
            return {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
