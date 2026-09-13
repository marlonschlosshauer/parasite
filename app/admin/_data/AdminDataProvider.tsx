"use client";

import { DbClient, DbProvider } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/query-core";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { WorkspaceLoading } from "@/app/admin/_components/WorkspaceLoading";

const subscribe = () => () => {};

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const [client] = useState(() => new DbClient({
    queryClient: new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          refetchOnReconnect: false,
          refetchOnWindowFocus: false,
          staleTime: Infinity,
        },
      },
    }),
  }));

  return (
    <DbProvider client={client}>
      {isClient ? children : (
        <main className="admin-main">
          <div className="admin-page"><section className="admin-content"><WorkspaceLoading /></section></div>
        </main>
      )}
    </DbProvider>
  );
}
