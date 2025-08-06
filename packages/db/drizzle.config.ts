
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle_backup",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
