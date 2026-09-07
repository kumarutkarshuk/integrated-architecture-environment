import Link from "next/link";
import { Button } from "../components/ui/button";
import { LANDING_PATH } from "../lib/routes";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="surface-glass w-full max-w-md rounded-2xl p-6 text-center">
        <p className="text-xs tracking-wide text-muted uppercase">404</p>
        <h1 className="display-type mt-2 text-2xl font-semibold">
          This page is not on the canvas
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The link you followed does not point at anything here.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild className="press-feedback rounded-full px-5">
            <Link href={LANDING_PATH}>Back to the start</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
