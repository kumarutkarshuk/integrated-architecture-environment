"use client";

import { useState } from "react";
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
              This Spec is from the canvas when you clicked Export. Collaborators may have changed the live canvas since then. Check the canvas before you treat this as current.
            </DialogDescription>
          </DialogHeader>

          {spec && (
            <div className="max-h-[60vh] overflow-auto text-sm text-foreground [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-2 [&_hr]:my-3 [&_hr]:border-sidebar-border [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4">
              <Markdown>{formatSpecFile(spec)}</Markdown>
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
