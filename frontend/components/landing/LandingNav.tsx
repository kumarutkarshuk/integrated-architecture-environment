"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { LANDING_PATH, WORKSPACE_PATH } from "../../lib/routes";

/**
 * A floating translucent bar the page scrolls under, rather than a strip of
 * chrome that eats the top of the viewport.
 */
export function LandingNav({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center p-3 sm:p-4">
      <nav
        aria-label="Main"
        className="surface-glass flex w-full max-w-5xl items-center justify-between gap-3 rounded-full py-2 pr-2 pl-4 sm:pl-5"
      >
        <Link
          href={LANDING_PATH}
          className="truncate text-sm font-medium tracking-tight"
        >
          <span className="sm:hidden">IAE</span>
          <span className="hidden sm:inline">
            Integrated Architecture Environment
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          {isSignedIn ? (
            <Button asChild size="sm" className="press-feedback rounded-full">
              <Link href={WORKSPACE_PATH}>Workspace</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="press-feedback rounded-full"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="press-feedback rounded-full">
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
