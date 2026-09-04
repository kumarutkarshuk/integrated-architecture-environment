"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { createTLStore, defaultShapeUtils } from "tldraw";
import type { TLRecord, TLStoreWithStatus } from "tldraw";
import { WebsocketProvider } from "y-websocket";
import { YKeyValue } from "y-utility/y-keyvalue";
import * as Y from "yjs";
import { getApiBaseUrl } from "../lib/api";
import { getCanvasWsBaseUrl, getCanvasYArrayName } from "../lib/canvas";

export function useYjsTldrawStore(
  projectId: string | null,
  enabled: boolean,
): TLStoreWithStatus | null {
  const { getToken } = useAuth();
  const [storeWithStatus, setStoreWithStatus] =
    useState<TLStoreWithStatus | null>(null);

  useEffect(() => {
    if (!projectId || !enabled) {
      setStoreWithStatus(null);
      return;
    }

    let cancelled = false;
    let provider: WebsocketProvider | null = null;
    let yDoc: Y.Doc | null = null;
    let unsubscribeStore: (() => void) | null = null;
    let removeYStoreListener: (() => void) | null = null;

    const activeProjectId = projectId;

    async function connect() {
      setStoreWithStatus({ status: "loading" });

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        const store = createTLStore({
          shapeUtils: [...defaultShapeUtils],
        });
        yDoc = new Y.Doc({ gc: true });
        const yArray = yDoc.getArray<{ key: string; val: TLRecord }>(
          getCanvasYArrayName(activeProjectId),
        );
        const yStore = new YKeyValue(yArray);

        provider = new WebsocketProvider(
          getCanvasWsBaseUrl(getApiBaseUrl()),
          activeProjectId,
          yDoc,
          {
            connect: true,
            params: { token },
          },
        );

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Canvas sync timed out")),
            10000,
          );

          provider?.on("sync", (isSynced: boolean) => {
            if (isSynced) {
              clearTimeout(timeout);
              resolve();
            }
          });
        });

        if (cancelled) {
          return;
        }

        const applyRemoteChanges = (
          events: Y.YMapEvent<TLRecord>,
        ) => {
          const toAdd: TLRecord[] = [];
          const toUpdate: TLRecord[] = [];
          const toRemove: TLRecord["id"][] = [];

          events.changes.keys.forEach((change, key) => {
            switch (change.action) {
              case "add": {
                const record = yStore.get(key);
                if (record) {
                  toAdd.push(record);
                }
                break;
              }
              case "update": {
                const record = yStore.get(key);
                if (record) {
                  toUpdate.push(record);
                }
                break;
              }
              case "delete":
                toRemove.push(key as TLRecord["id"]);
                break;
            }
          });

          store.mergeRemoteChanges(() => {
            if (toAdd.length > 0) {
              store.put(toAdd);
            }
            if (toUpdate.length > 0) {
              store.put(toUpdate);
            }
            if (toRemove.length > 0) {
              store.remove(toRemove);
            }
          });
        };

        const onYStoreChange = (events: Y.YMapEvent<TLRecord>) => {
          applyRemoteChanges(events);
        };

        yStore.on("change", onYStoreChange);
        removeYStoreListener = () => {
          yStore.off("change", onYStoreChange);
        };

        unsubscribeStore = store.listen(
          ({ changes }) => {
            yDoc?.transact(() => {
              for (const record of Object.values(changes.added)) {
                yStore.set(record.id, record);
              }
              for (const [, record] of Object.values(changes.updated)) {
                yStore.set(record.id, record);
              }
              for (const record of Object.values(changes.removed)) {
                yStore.delete(record.id);
              }
            });
          },
          { source: "user", scope: "document" },
        );

        provider.on("status", ({ status }: { status: string }) => {
          if (cancelled) {
            return;
          }

          setStoreWithStatus((current) => {
            if (!current || current.status !== "synced-remote") {
              return current;
            }

            return {
              ...current,
              connectionStatus: status === "connected" ? "online" : "offline",
            };
          });
        });

        if (!cancelled) {
          setStoreWithStatus({
            status: "synced-remote",
            store,
            connectionStatus: "online",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setStoreWithStatus({
            status: "error",
            error:
              error instanceof Error ? error : new Error("Canvas sync failed"),
          });
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
      unsubscribeStore?.();
      removeYStoreListener?.();
      provider?.destroy();
      yDoc?.destroy();
    };
  }, [projectId, enabled, getToken]);

  return storeWithStatus;
}
