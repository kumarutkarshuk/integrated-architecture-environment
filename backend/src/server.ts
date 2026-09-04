import http from "node:http";
import type { Express } from "express";
import type { AppConfig } from "./config.js";
import { attachCanvasWebSocket } from "./canvas/ws.js";

export function createHttpServer(app: Express, config: AppConfig) {
  const server = http.createServer(app);
  attachCanvasWebSocket(server, config);
  return server;
}
