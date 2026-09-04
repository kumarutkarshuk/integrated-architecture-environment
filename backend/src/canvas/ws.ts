import type { IncomingMessage } from "node:http";
import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { setupWSConnection } from "@y/websocket-server/utils";
import type { AppConfig } from "../config.js";
import { createClerkTokenVerifier } from "../auth/clerk-token-verifier.js";
import { createTestTokenVerifier } from "../auth/test-token-verifier.js";
import type { TokenVerifier } from "../auth/token-verifier.js";
import { getBearerToken, upsertUserFromClaims } from "../auth/user.js";
import { findAccessibleProject } from "../projects/access.js";
import { configureCanvasPersistence } from "./persistence.js";

function getProjectIdFromRequest(req: IncomingMessage): string | null {
  const url = new URL(req.url ?? "/", "http://localhost");
  const match = url.pathname.match(/^\/ws\/projects\/([^/]+)$/);
  return match?.[1] ?? null;
}

function getTokenFromRequest(req: IncomingMessage): string | null {
  const headerToken = getBearerToken(req.headers.authorization);
  if (headerToken) {
    return headerToken;
  }

  const url = new URL(req.url ?? "/", "http://localhost");
  return url.searchParams.get("token");
}

async function authorizeCanvasConnection(
  req: IncomingMessage,
  tokenVerifier: TokenVerifier,
): Promise<{ ok: true; projectId: string } | { ok: false; code: number }> {
  const projectId = getProjectIdFromRequest(req);

  if (!projectId) {
    return { ok: false, code: 404 };
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return { ok: false, code: 401 };
  }

  try {
    const claims = await tokenVerifier.verify(token);
    const user = await upsertUserFromClaims(claims);
    const project = await findAccessibleProject(projectId, user.id);

    if (!project) {
      return { ok: false, code: 404 };
    }

    if (project.status !== "ready") {
      return { ok: false, code: 403 };
    }

    return { ok: true, projectId };
  } catch {
    return { ok: false, code: 401 };
  }
}

function writeUpgradeError(socket: import("node:stream").Duplex, code: number) {
  const message =
    code === 401 ? "Unauthorized" : code === 403 ? "Forbidden" : "Not Found";
  socket.write(`HTTP/1.1 ${code} ${message}\r\n\r\n`);
}

export function attachCanvasWebSocket(
  server: Server,
  config: AppConfig,
): WebSocketServer {
  configureCanvasPersistence();

  const tokenVerifier = config.isTest
    ? createTestTokenVerifier()
    : createClerkTokenVerifier(config.clerkSecretKey);

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    void (async () => {
      const auth = await authorizeCanvasConnection(req, tokenVerifier);

      if (!auth.ok) {
        writeUpgradeError(socket, auth.code);
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    })();
  });

  wss.on("connection", (conn: WebSocket, req: IncomingMessage) => {
    const projectId = getProjectIdFromRequest(req);
    if (!projectId) {
      conn.close();
      return;
    }

    setupWSConnection(conn, req, { docName: projectId, gc: true });
  });

  return wss;
}
