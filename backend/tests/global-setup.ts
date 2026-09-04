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

  execSync(
    'echo "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" | bunx prisma db execute --stdin --schema prisma/schema.prisma',
    {
      cwd: backendRoot,
      env: process.env,
      stdio: "inherit",
      shell: "/bin/sh",
    },
  );

  execSync("bunx prisma migrate deploy", {
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
