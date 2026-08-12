"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { LocaleProvider } from "@/lib/i18n/context";
import { AuthProvider } from "@/lib/auth/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime:15_000, retry:1 } }
  }));
  return (
    <AuthProvider>
      <QueryClientProvider client={client}>
        <LocaleProvider>
          {children}
          <Toaster richColors position="bottom-right" toastOptions={{ style:{ borderRadius:8 } }} />
        </LocaleProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
