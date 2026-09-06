import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { configureMailerFromEnv } from "./invites/mailer.js";
import { createHttpServer } from "./server.js";

const config = loadConfig();
configureMailerFromEnv();
const app = createApp(config);
const server = createHttpServer(app, config);

server.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
