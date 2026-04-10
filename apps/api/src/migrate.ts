// Run by the Kubernetes init container before the API pod starts.
// Applies any pending Prisma migrations against the production database.
import { execSync } from "child_process";

console.log("Running Prisma migrations...");

try {
  execSync(
    "/app/apps/api/node_modules/.bin/prisma migrate deploy --schema /app/packages/db/prisma/schema.prisma",
    { stdio: "inherit", env: { ...process.env } }
  );
  console.log("Migrations complete.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
}
