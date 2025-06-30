import { auth } from "@call/auth/auth";
import { env } from "@/config/env";
import { cors } from "hono/cors";
import { db } from "@call/db";
import routes from "@/routes";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { WebSocketServer } from "./websocket-server";

export interface ReqVariables {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
  db: typeof db | null;
}

const app = new Hono<{ Variables: ReqVariables }>();

app.use("*", logger());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("db", null);
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("db", db);
  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

app.route("/api", routes);

// Initialize WebSocket server
new WebSocketServer();

export default app;
