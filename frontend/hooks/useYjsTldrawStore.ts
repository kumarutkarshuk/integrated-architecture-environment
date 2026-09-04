"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { createTLStore, defaultShapeUtils } from "tldraw";
import type { TLRecord, TLStoreWithStatus } from "tldraw";
import { WebsocketProvider } from "y-websocket";
import { YKeyValue } from "y-utility/y-keyvalue";
import * as Y from "yjs";
import { getApiBaseUrl } from "../lib/api";
import {
  CANVAS_SAVE_DEBOUNCE_MS,
  getCanvasWsBaseUrl,
  getCanvasYArrayName,
} from "../lib/canvas";

const LOCAL_ORIGIN = "tldraw-local";

export type CanvasSaveStatus =
  | "loading"
  | "saved"
  | "saving"
  | "offline"
  | "error";

type YKeyValueChange =
  | { action: "add"; newValue: TLRecord }
  | { action: "update"; oldValue: TLRecord; newValue: TLRecord }
  | { action: "delete"; oldValue: TLRecord };

function readRecordsFromYArray(
  yArray: Y.Array<{ key: string; val: TLRecord }>,
): TLRecord[] {
  const records: TLRecord[] = [];
  const seen = new Set<string>();

  for (let index = yArray.length - 1; index >= 0; index -= 1) {
    const entry = yArray.get(index);
    if (!seen.has(entry.key)) {
      seen.add(entry.key);
      records.push(entry.val);
    }
  }

  return records;
}

export function useYjsTldrawStore(
  projectId: string | null,
  enabled: boolean,
): {
  storeWithStatus: TLStoreWithStatus | null;
  saveStatus: CanvasSaveStatus;
} {
  const { getToken } = useAuth();
  const [storeWithStatus, setStoreWithStatus] =
    useState<TLStoreWithStatus | null>(null);
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("loading");

  useEffect(() => {
    if (!projectId || !enabled) {
      setStoreWithStatus(null);
      setSaveStatus("loading");
      return;
    }

    let cancelled = false;
    let provider: WebsocketProvider | null = null;
    let yDoc: Y.Doc | null = null;
    let unsubscribeStore: (() => void) | null = null;
    let removeYStoreListener: (() => void) | null = null;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let isConnected = false;

    const activeProjectId = projectId;

    function clearSaveTimer() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
    }

    function markSaving() {
      if (cancelled) {
        return;
      }

      setSaveStatus("saving");
      clearSaveTimer();
      saveTimer = setTimeout(() => {
        if (cancelled) {
          return;
        }
        setSaveStatus(isConnected ? "saved" : "offline");
      }, CANVAS_SAVE_DEBOUNCE_MS);
    }

    async function connect() {
      setStoreWithStatus({ status: "loading" });
      setSaveStatus("loading");

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

        const applyRemoteChanges = (changes: Map<string, YKeyValueChange>) => {
          const toAdd: TLRecord[] = [];
          const toUpdate: TLRecord[] = [];
          const toRemove: TLRecord["id"][] = [];

          changes.forEach((change, key) => {
            switch (change.action) {
              case "add":
                toAdd.push(change.newValue);
                break;
              case "update":
                toUpdate.push(change.newValue);
                break;
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

        const onYStoreChange = (
          changes: Map<string, YKeyValueChange>,
          transaction: Y.Transaction,
        ) => {
          if (transaction.origin === LOCAL_ORIGIN) {
            return;
          }

          applyRemoteChanges(changes);
        };

        yStore.on("change", onYStoreChange);
        removeYStoreListener = () => {
          yStore.off("change", onYStoreChange);
        };

        const initialRecords = readRecordsFromYArray(yArray);
        if (initialRecords.length > 0) {
          store.mergeRemoteChanges(() => {
            store.put(initialRecords);
          });
        }

        unsubscribeStore = store.listen(
          ({ changes }) => {
            const hasDocumentChanges =
              Object.keys(changes.added).length > 0 ||
              Object.keys(changes.updated).length > 0 ||
              Object.keys(changes.removed).length > 0;

            if (hasDocumentChanges) {
              markSaving();
            }

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
            }, LOCAL_ORIGIN);
          },
          { source: "user", scope: "document" },
        );

        provider.on("status", ({ status }: { status: string }) => {
          if (cancelled) {
            return;
          }

          isConnected = status === "connected";

          setStoreWithStatus((current) => {
            if (!current || current.status !== "synced-remote") {
              return current;
            }

            return {
              ...current,
              connectionStatus: isConnected ? "online" : "offline",
            };
          });

          if (!isConnected) {
            setSaveStatus((current) =>
              current === "loading" ? current : "offline",
            );
            return;
          }

          setSaveStatus((current) => {
            if (current === "offline") {
              return "saved";
            }
            return current;
          });
        });

        isConnected = true;

        if (!cancelled) {
          setStoreWithStatus({
            status: "synced-remote",
            store,
            connectionStatus: "online",
          });
          setSaveStatus("saved");
        }
      } catch (error) {
        if (!cancelled) {
          setStoreWithStatus({
            status: "error",
            error:
              error instanceof Error ? error : new Error("Canvas sync failed"),
          });
          setSaveStatus("error");
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
      clearSaveTimer();
      unsubscribeStore?.();
      removeYStoreListener?.();
      provider?.destroy();
      yDoc?.destroy();
    };
  }, [projectId, enabled, getToken]);

  return { storeWithStatus, saveStatus };
}
