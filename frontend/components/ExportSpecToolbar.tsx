"use client";

import { useState } from "react";
import type { ExportedSpec } from "../hooks/useExportSpec";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type ConfirmKind = "close-sure" | "close-gaps" | "copy-gaps" | "download-gaps";

interface ExportSpecToolbarProps {
  canExport: boolean;
  actionsEnabled: boolean;
  isExporting: boolean;
  spec: ExportedSpec | null;
  downloadFileName: string;
  onExport: () => void;
  onClear: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export function ExportSpecToolbar({
  canExport,
  actionsEnabled,
  isExporting,
  spec,
  downloadFileName,
  onExport,
  onClear,
  onCopy,
  onDownload,
}: ExportSpecToolbarProps) {
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);

  if (!canExport) {
    return null;
  }

  function requestClose() {
    setConfirmKind("close-sure");
  }

  function cancelConfirm() {
    setConfirmKind(null);
  }

  function confirmAction() {
    if (confirmKind === "close-sure") {
      setConfirmKind("close-gaps");
      return;
    }

    if (confirmKind === "close-gaps") {
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
  }

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

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!actionsEnabled || isExporting}
        onClick={onExport}
      >
        {isExporting ? "Exporting spec..." : "Export Spec"}
      </Button>

      <Dialog
        open={spec !== null}
        onOpenChange={(open) => {
          if (!open) {
            requestClose();
          }
        }}
      >
        <DialogContent
          onPointerDownOutside={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>Exported Spec</DialogTitle>
            <DialogDescription>
              Markdown from the current canvas, plus a gaps summary.
            </DialogDescription>
          </DialogHeader>

          {spec && (
            <div className="grid max-h-[60vh] gap-3 overflow-auto text-sm">
              <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">
                {spec.markdown}
              </pre>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Gaps summary
                </p>
                <p className="text-sm text-foreground">{spec.gaps_summary}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={requestClose}>
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmKind("copy-gaps")}
            >
              Copy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setConfirmKind("download-gaps")}
              aria-label={`Download ${downloadFileName}`}
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
