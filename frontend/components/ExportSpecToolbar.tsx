"use client";

import type { ExportedSpec } from "../hooks/useExportSpec";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ExportSpecToolbarProps {
  canExport: boolean;
  isExporting: boolean;
  spec: ExportedSpec | null;
  error: string | null;
  downloadFileName: string;
  onExport: () => void;
  onClear: () => void;
  onDownload: () => void;
}

export function ExportSpecToolbar({
  canExport,
  isExporting,
  spec,
  error,
  downloadFileName,
  onExport,
  onClear,
  onDownload,
}: ExportSpecToolbarProps) {
  if (!canExport) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isExporting}
        onClick={onExport}
      >
        {isExporting ? "Exporting spec..." : "Export Spec"}
      </Button>
      {error && <span className="text-red-400">{error}</span>}

      <Dialog open={spec !== null} onOpenChange={(open) => !open && onClear()}>
        <DialogContent>
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
            <Button type="button" variant="outline" size="sm" onClick={onClear}>
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onDownload}
              aria-label={`Download ${downloadFileName}`}
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
