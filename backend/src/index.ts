import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createHttpServer } from "./server.js";

const config = loadConfig();
const app = createApp(config);
const server = createHttpServer(app, config);

server.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
