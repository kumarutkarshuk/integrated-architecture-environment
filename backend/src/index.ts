import { createApp } from "./app.js";
import { configureGenerateService } from "./ai/generate-service.js";
import { recoverStaleGenerateJobs } from "./ai/recover-stale-jobs.js";
import { loadConfig } from "./config.js";
import { createHttpServer } from "./server.js";

const config = loadConfig();
configureGenerateService(config);
const app = createApp(config);
const server = createHttpServer(app, config);

if (config.groqApiKey && !config.isTest) {
  console.log(`AI inference: Groq (${config.groqModel})`);
} else if (!config.isTest) {
  console.log("AI inference: fixture (set GROQ_API_KEY to enable Groq)");
}

void recoverStaleGenerateJobs().then((count) => {
  if (count > 0 && !config.isTest) {
    console.log(`Recovered ${count} stale AI generation job(s)`);
  }
});

server.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
