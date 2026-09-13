"use client";

import {
  collectionOptions,
  DbClient,
  useDbClient,
  useLiveQuery,
} from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { QueryClient } from "@tanstack/query-core";
import { saveEntryAction } from "@/app/admin/actions";
import {
  EntryDetailSchema,
  WorkspaceMetadataSchema,
  WorkspaceSnapshotSchema,
  type EntryDetail,
} from "@/lib/entries.shared";
import type { WorkspaceTarget } from "@/lib/workspace-target";

const entryDescriptors = new Map<string, ReturnType<typeof createEntryDescriptor>>();
const metadataDescriptors = new Map<string, ReturnType<typeof createMetadataDescriptor>>();

function workspaceKey(target: WorkspaceTarget) {
  return `${target.repository.owner}/${target.repository.name}:${target.branch}`;
}

function queryKey(target: WorkspaceTarget) {
  return ["admin-workspace", target.repository.owner, target.repository.name, target.branch] as const;
}

async function fetchWorkspace(target: WorkspaceTarget) {
  const response = await fetch("/admin/workspace-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error
      : `Workspace synchronization failed with status ${response.status}.`;
    throw new Error(message);
  }
  return WorkspaceSnapshotSchema.parse(body);
}

function createEntryDescriptor(target: WorkspaceTarget) {
  const key = workspaceKey(target);
  return collectionOptions(`admin-entries:${key}`, (client) =>
    queryCollectionOptions({
      queryKey: queryKey(target),
      queryFn: () => fetchWorkspace(target),
      select: (snapshot) => snapshot.entries,
      queryClient: client.requireDependency<QueryClient>("queryClient"),
      schema: EntryDetailSchema,
      getKey: (entry) => entry.id,
      staleTime: Infinity,
      gcTime: Infinity,
      retry: 1,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const entry = mutation.modified;
          const result = await saveEntryAction(target, {
            name: entry.name,
            kind: entry.kind,
            schema: entry.schema,
            fields: entry.fields,
          });
          if (!result.ok) throw new Error(result.message);
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const entry = mutation.modified;
          const result = await saveEntryAction(target, {
            id: entry.id,
            name: entry.name,
            kind: entry.kind,
            schema: entry.schema,
            fields: entry.fields,
            version: mutation.original.version,
          });
          if (!result.ok) throw new Error(result.message);
        }
      },
    }),
  );
}

function createMetadataDescriptor(target: WorkspaceTarget) {
  const key = workspaceKey(target);
  return collectionOptions(`admin-workspace-metadata:${key}`, (client) =>
    queryCollectionOptions({
      queryKey: queryKey(target),
      queryFn: () => fetchWorkspace(target),
      select: (snapshot) => [snapshot.metadata],
      queryClient: client.requireDependency<QueryClient>("queryClient"),
      schema: WorkspaceMetadataSchema,
      getKey: (metadata) => metadata.id,
      staleTime: Infinity,
      gcTime: Infinity,
      retry: 1,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }),
  );
}

function getEntryDescriptor(target: WorkspaceTarget) {
  const key = workspaceKey(target);
  let descriptor = entryDescriptors.get(key);
  if (!descriptor) {
    descriptor = createEntryDescriptor(target);
    entryDescriptors.set(key, descriptor);
  }
  return descriptor;
}

function getMetadataDescriptor(target: WorkspaceTarget) {
  const key = workspaceKey(target);
  let descriptor = metadataDescriptors.get(key);
  if (!descriptor) {
    descriptor = createMetadataDescriptor(target);
    metadataDescriptors.set(key, descriptor);
  }
  return descriptor;
}

export function getWorkspaceCollections(client: DbClient, target: WorkspaceTarget) {
  return {
    entries: client.collection(getEntryDescriptor(target)),
    metadata: client.collection(getMetadataDescriptor(target)),
  };
}

export function useWorkspaceCollections(target: WorkspaceTarget) {
  return getWorkspaceCollections(useDbClient(), target);
}

export function useWorkspaceSnapshot(target: WorkspaceTarget) {
  const collections = useWorkspaceCollections(target);
  const entries = useLiveQuery({
    query: (query) => query.from({ entry: collections.entries }),
  });
  const metadata = useLiveQuery({
    query: (query) => query.from({ metadata: collections.metadata }),
  });
  const error = collections.entries.utils.lastError ?? collections.metadata.utils.lastError;

  return {
    entries: entries.data as EntryDetail[],
    metadata: metadata.data[0],
    isLoading: entries.isLoading || metadata.isLoading,
    isError: entries.isError || metadata.isError,
    isFetching: collections.entries.utils.isFetching,
    error,
    collections,
    refresh: () => collections.entries.utils.refetch({ throwOnError: true }),
  };
}
