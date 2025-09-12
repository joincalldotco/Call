import { Hono } from "hono";
import type { ReqVariables } from "../index.js";
import authRoutes from "./auth/index.js";
import callsRoutes from "./calls/index.js";
import contactsRoutes from "./contacts/index.js";
import notificationsRoutes from "./notifications/index.js";
import roomRoutes from "./room/index.js";
import teamsRoutes from "./teams/index.js";
import thoughtsRoutes from "./thoughts/index.js";

const routes = new Hono<{ Variables: ReqVariables }>();

routes.route("/auth", authRoutes);
routes.route("/calls", callsRoutes);
routes.route("/contacts", contactsRoutes);
routes.route("/notifications", notificationsRoutes);
routes.route("/room", roomRoutes);
routes.route("/teams", teamsRoutes);
routes.route("/thoughts", thoughtsRoutes);

export default routes;
