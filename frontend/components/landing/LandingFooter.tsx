import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-sidebar-border bg-sidebar/50 px-4 py-8 text-xs text-muted md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">IAE</span>
          <span>&middot;</span>
          <span>Integrated Architecture Environment</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#architecture"
            className="transition-colors hover:text-foreground"
          >
            Architecture
          </a>
          <Link
            href="/workspace"
            className="transition-colors hover:text-foreground"
          >
            Studio
          </Link>
        </div>
      </div>
    </footer>
  );
}
