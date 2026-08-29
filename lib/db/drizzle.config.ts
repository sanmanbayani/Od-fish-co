import { defineConfig } from "drizzle-kit";
import path from "path";
import { resolveConnectionString } from "./src/connection";

// Resolved through the same helper the runtime uses, so `push` can never target
// a different database than the application does.
export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: resolveConnectionString(),
  },
});
