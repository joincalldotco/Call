import { Hono } from "hono";
import { z } from "zod";
import { db } from "@call/db";
import { teams, teamMembers, user as userTable } from "@call/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { eq, inArray, and, desc } from "drizzle-orm";
import type { ReqVariables } from "../../index.js";
import { cache } from "@/lib/cache";

const teamsRoutes = new Hono<{ Variables: ReqVariables }>();

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  members: z.array(z.string().email("Invalid email format")).optional(),
});

// POST /api/teams/create - Create a new team
teamsRoutes.post("/create", async (c) => {
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
  const result = createTeamSchema.safeParse(body);
  if (!result.success) {
    return c.json(
      { message: result.error.errors[0]?.message || "Invalid input" },
      400
    );
  }
  const { name, members } = result.data;

  let users: (typeof userTable.$inferSelect)[] = [];
  if (members && members.length > 0) {
    users = await db
      .select()
      .from(userTable)
      .where(inArray(userTable.email, members));
    if (users.length !== members.length) {
      const foundEmails = users.map((u) => u.email);
      const missing = members.filter((email) => !foundEmails.includes(email));
      return c.json(
        { message: `Email(s) not registered: ${missing.join(", ")}` },
        400
      );
    }
  }

  const teamId = createId();
  await db.insert(teams).values({
    id: teamId,
    name,
    creatorId: user.id,
    createdAt: new Date(),
  });

  const memberIds = users.map((u) => u.id);
  if (!memberIds.includes(user.id)) {
    memberIds.push(user.id);
  }
  const teamMemberRows = memberIds.map((uid) => ({
    teamId,
    userId: uid,
    createdAt: new Date(),
  }));
  await db.insert(teamMembers).values(teamMemberRows);

  // Invalidate cache for all team members
  await cache.invalidateTeamCache(teamId, memberIds);

  return c.json({ message: "Team created" });
});

// GET /api/teams - List teams for authenticated user
teamsRoutes.get("/", async (c) => {
  const user = c.get("user");
  if (!user || !user.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const cacheKey = cache.getUserTeamsKey(user.id);

  // Try to get from cache first
  const cachedTeams = await cache.get(cacheKey);
  if (cachedTeams) {
    console.log(`[CACHE HIT] Teams for user ${user.id}`);
    return c.json({ teams: cachedTeams });
  }

  console.log(`[CACHE MISS] Teams for user ${user.id}`);

  const userTeams = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id));
  const teamIds = userTeams.map((t) => t.teamId);
  if (teamIds.length === 0) {
    await cache.set(cacheKey, [], 5); // Cache for 5 minutes
    return c.json({ teams: [] });
  }

  const teamsList = await db
    .select({
      id: teams.id,
      name: teams.name,
      creatorId: teams.creatorId,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .where(inArray(teams.id, teamIds))
    .orderBy(desc(teams.createdAt));
  const allTeamMembers = await db
    .select({
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      name: userTable.name,
      email: userTable.email,
    })
    .from(teamMembers)
    .leftJoin(userTable, eq(teamMembers.userId, userTable.id))
    .where(inArray(teamMembers.teamId, teamIds));

  const teamMembersMap: Record<
    string,
    Array<{ user_id: string; name: string; email: string }>
  > = {};
  for (const m of allTeamMembers) {
    if (!m.teamId || !m.userId) continue;
    if (!teamMembersMap[m.teamId]) teamMembersMap[m.teamId] = [];
    teamMembersMap[m.teamId]!.push({
      user_id: m.userId,
      name: m.name ?? "",
      email: m.email ?? "",
    });
  }

  const response = teamsList.map((team) => ({
    id: team.id,
    name: team.name,
    creator_id: team.creatorId,
    members: teamMembersMap?.[team.id] || [],
  }));

  // Cache the result for 5 second
  await cache.set(cacheKey, response, 5);

  return c.json({ teams: response });
});

// POST /api/teams/:teamId/leave - Leave a team
teamsRoutes.post(":teamId/leave", async (c) => {
  const user = c.get("user");
  if (!user || !user.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const teamId = c.req.param("teamId");
  if (!teamId) {
    return c.json({ message: "Team ID is required" }, 400);
  }

  // Check if user is a member of the team
  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
    );
  if (!membership) {
    return c.json({ message: "You are not a member of this team" }, 404);
  }

  // Get all team members before deletion for cache invalidation
  const allMembers = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  const memberIds = allMembers.map((m) => m.userId);

  await db
    .delete(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
    );

  // Invalidate cache for all team members
  await cache.invalidateTeamCache(teamId, memberIds);

  return c.json({ message: "Left team successfully" });
});

// POST /api/teams/:teamId/add-members - Add users to a team
teamsRoutes.post(":teamId/add-members", async (c) => {
  const user = c.get("user");
  if (!user || !user.id) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const teamId = c.req.param("teamId");
  if (!teamId) {
    return c.json({ message: "Team ID is required" }, 400);
  }

  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ message: "Invalid JSON body" }, 400);
  }
  const addMembersSchema = z.object({
    emails: z.array(z.string().email("Invalid email format")).min(1),
  });
  const result = addMembersSchema.safeParse(body);
  if (!result.success) {
    return c.json(
      { message: result.error.errors[0]?.message || "Invalid input" },
      400
    );
  }
  const { emails } = result.data;

  const users = await db
    .select()
    .from(userTable)
    .where(inArray(userTable.email, emails));
  if (users.length !== emails.length) {
    const foundEmails = users.map((u) => u.email);
    const missing = emails.filter((email) => !foundEmails.includes(email));
    return c.json(
      { message: `Email(s) not registered: ${missing.join(", ")}` },
      400
    );
  }

  const userIds = users.map((u) => u.id);
  const existingMembers = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), inArray(teamMembers.userId, userIds))
    );
  const alreadyMemberIds = new Set(existingMembers.map((m) => m.userId));
  const newMemberIds = userIds.filter((uid) => !alreadyMemberIds.has(uid));
  if (newMemberIds.length === 0) {
    return c.json(
      { message: "All users are already members of this team" },
      400
    );
  }

  // Get all current team members for cache invalidation
  const allCurrentMembers = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  const allMemberIds = [
    ...allCurrentMembers.map((m) => m.userId),
    ...newMemberIds,
  ];

  const now = new Date();
  const rows = newMemberIds.map((uid) => ({
    teamId,
    userId: uid,
    createdAt: now,
  }));
  await db.insert(teamMembers).values(rows);

  // Invalidate cache for all team members (existing + new)
  await cache.invalidateTeamCache(teamId, allMemberIds);

  return c.json({ message: "Users added to team" });
});

export default teamsRoutes;
