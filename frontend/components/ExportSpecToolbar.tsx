"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import Markdown from "react-markdown";
import { formatSpecFile, type ExportedSpec } from "../hooks/useExportSpec";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

type ConfirmKind = "close-sure" | "close-gaps" | "copy-gaps" | "download-gaps";

interface ExportSpecToolbarProps {
  canExport: boolean;
  actionsEnabled: boolean;
  isExporting: boolean;
  onExport: () => void;
}

interface ExportSpecPanelProps {
  spec: ExportedSpec | null;
  isExporting: boolean;
  downloadFileName: string;
  onClear: () => void;
  onCopy: () => void;
  onDownload: () => void;
  closeRef?: MutableRefObject<(() => void) | null>;
}

export function ExportSpecToolbar({
  canExport,
  actionsEnabled,
  isExporting,
  onExport,
}: ExportSpecToolbarProps) {
  if (!canExport) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-6 rounded-md px-2 font-mono text-[11px]"
      disabled={!actionsEnabled || isExporting}
      onClick={onExport}
    >
      {isExporting ? "Exporting spec..." : "Export Spec"}
    </Button>
  );
}

export function useExportSpecConfirm({
  spec,
  onClear,
  onCopy,
  onDownload,
}: {
  spec: ExportedSpec | null;
  onClear: () => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const closingSpecRef = useRef(false);

  useEffect(() => {
    if (spec === null) {
      closingSpecRef.current = false;
      setConfirmKind(null);
    }
  }, [spec]);

  const requestClose = useCallback(() => {
    if (spec === null || closingSpecRef.current) {
      return;
    }

    setConfirmKind((current) => current ?? "close-sure");
  }, [spec]);

  const requestCopy = useCallback(() => {
    setConfirmKind("copy-gaps");
  }, []);

  const requestDownload = useCallback(() => {
    setConfirmKind("download-gaps");
  }, []);

  const cancelConfirm = useCallback(() => {
    setConfirmKind(null);
  }, []);

  const confirmAction = useCallback(() => {
    if (confirmKind === "close-sure") {
      setConfirmKind("close-gaps");
      return;
    }

    if (confirmKind === "close-gaps") {
      closingSpecRef.current = true;
      setConfirmKind(null);
      onClear();
      return;
    }

    if (confirmKind === "copy-gaps") {
      setConfirmKind(null);
      onCopy();
      return;
    }

    if (confirmKind === "download-gaps") {
      setConfirmKind(null);
      onDownload();
    }
  }, [confirmKind, onClear, onCopy, onDownload]);

  const confirmCopy = confirmKind === "copy-gaps";
  const confirmTitle =
    confirmKind === "close-sure"
      ? "Are you sure?"
      : "Have you reviewed the gaps?";
  const confirmBody =
    confirmKind === "close-sure"
      ? "This will hide the exported spec."
      : confirmKind === "close-gaps"
        ? "Please check the gaps summary before you close."
        : confirmCopy
          ? "Please check the gaps summary before you copy."
          : "Please check the gaps summary before you download.";
  const confirmActionLabel =
    confirmKind === "close-sure"
      ? "Yes, close"
      : confirmKind === "close-gaps"
        ? "Yes, I reviewed the gaps"
        : confirmCopy
          ? "Copy"
          : "Download";

  return {
    confirmKind,
    requestClose,
    requestCopy,
    requestDownload,
    cancelConfirm,
    confirmAction,
    confirmTitle,
    confirmBody,
    confirmActionLabel,
  };
}

export function ExportSpecConfirmDialog({
  confirmKind,
  confirmTitle,
  confirmBody,
  confirmActionLabel,
  cancelConfirm,
  confirmAction,
}: {
  confirmKind: ConfirmKind | null;
  confirmTitle: string;
  confirmBody: string;
  confirmActionLabel: string;
  cancelConfirm: () => void;
  confirmAction: () => void;
}) {
  return (
    <AlertDialog
      open={confirmKind !== null}
      onOpenChange={(open) => {
        if (!open) {
          cancelConfirm();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{confirmBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={cancelConfirm}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={confirmAction}>
            {confirmActionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ExportSpecPanel({
  spec,
  isExporting,
  downloadFileName,
  onClear,
  onCopy,
  onDownload,
  closeRef,
}: ExportSpecPanelProps) {
  const confirm = useExportSpecConfirm({
    spec,
    onClear,
    onCopy,
    onDownload,
  });

  useEffect(() => {
    if (!closeRef) {
      return;
    }

    closeRef.current = confirm.requestClose;
    return () => {
      closeRef.current = null;
    };
  }, [closeRef, confirm.requestClose]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-3 py-2">
        <p className="text-[11px] text-muted">
          This Spec is from the canvas when you clicked Export. Collaborators
          may have changed the live canvas since then. Check the canvas
          before you treat this as current.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!spec}
            onClick={confirm.requestCopy}
          >
            Copy
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!spec}
            onClick={confirm.requestDownload}
            aria-label={`Download ${downloadFileName}`}
          >
            Download
          </Button>
        </div>
      </div>

      {isExporting && !spec && (
        <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-sky-400">
          <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
          Exporting spec...
        </div>
      )}

      {spec && (
        <div className="min-h-0 flex-1 overflow-auto p-4 text-sm text-foreground [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-2 [&_hr]:my-3 [&_hr]:border-sidebar-border [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4">
          <Markdown>{formatSpecFile(spec)}</Markdown>
        </div>
      )}

      <ExportSpecConfirmDialog
        confirmKind={confirm.confirmKind}
        confirmTitle={confirm.confirmTitle}
        confirmBody={confirm.confirmBody}
        confirmActionLabel={confirm.confirmActionLabel}
        cancelConfirm={confirm.cancelConfirm}
        confirmAction={confirm.confirmAction}
      />
    </div>
  );
}
