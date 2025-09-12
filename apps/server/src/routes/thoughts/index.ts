import { sendToDiscordWebhook } from "@/lib/discord";
import { Hono } from "hono";
import { z } from "zod";
import type { ReqVariables } from "@/index";
import { env } from "@/config/env";

const thoughtsRoutes = new Hono<{ Variables: ReqVariables }>();

const createThoughtSchema = z.object({
  description: z.string().min(1, "Description is required"),
  type: z.enum(["thoughts", "bug", "feature", "improvment", "other"]),
});

thoughtsRoutes.post("/create", async (c) => {
  const user = c.get("user");
  if (!user || !user.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ message: "Invalid JSON body" }, 400);
  }
  const result = createThoughtSchema.safeParse(body);
  if (!result.success) {
    return c.json(
      { message: result.error.errors[0]?.message || "Invalid input" },
      400
    );
  }
  const { description, type } = result.data;

  sendToDiscordWebhook(
    type,
    description,
    user,
    env.DISCORD_URL
  );

  return c.json({ message: "Team created" });
});

export default thoughtsRoutes;
