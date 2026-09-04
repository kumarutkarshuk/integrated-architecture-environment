import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export default async function globalSetup() {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    "postgresql://iae:iae@localhost:5432/iae_test";

  execSync("bunx prisma db push --skip-generate", {
    cwd: backendRoot,
    env: process.env,
    stdio: "inherit",
  });

  execSync("bunx prisma generate", {
    cwd: backendRoot,
    env: process.env,
    stdio: "inherit",
  });
}
