export function getWidgetOrigin(): string {
  if (typeof window === "undefined") {
    return "http://localhost:3000";
  }
  return window.location.origin;
}

// Setup snippets stay on relay v5 so Cursor matches the page. v6 drops tools and breaks calls.
export function cursorRelayConfig(origin: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        "webmcp-local-relay": {
          command: "npx",
          args: [
            "-y",
            "@mcp-b/webmcp-local-relay@5",
            "--widget-origin",
            origin,
          ],
        },
      },
    },
    null,
    2,
  );
}

export function claudeCodeRelayCommand(origin: string): string {
  return `claude mcp add webmcp-local-relay -- npx -y @mcp-b/webmcp-local-relay@5 --widget-origin ${origin}`;
}

export function codexRelayConfig(origin: string): string {
  return [
    "[mcp_servers.webmcp-local-relay]",
    'command = "npx"',
    `args = ["-y", "@mcp-b/webmcp-local-relay@5", "--widget-origin", "${origin}"]`,
  ].join("\n");
}
