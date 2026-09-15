export function DesktopOnlyGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex h-dvh flex-col items-center justify-center bg-background px-6 text-center md:hidden">
        <p className="max-w-sm font-mono text-sm text-foreground">
          Only supported on desktop browsers.
        </p>
      </div>
      <div className="hidden h-full md:contents">{children}</div>
    </>
  );
}
