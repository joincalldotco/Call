import type { InferSelectModel } from "drizzle-orm";
import * as schema from "./schema";

export type Room = InferSelectModel<typeof schema.room>;
export type User = InferSelectModel<typeof schema.user>;
export type Session = InferSelectModel<typeof schema.session>;
export type Account = InferSelectModel<typeof schema.account>;
export type Verification = InferSelectModel<typeof schema.verification>;

export type RateLimitAttempts = InferSelectModel<
  typeof schema.rateLimitAttempts
>;
export type ContactRequests = InferSelectModel<typeof schema.contactRequests>;
export type Contacts = InferSelectModel<typeof schema.contacts>;
export type Teams = InferSelectModel<typeof schema.teams>;
export type TeamMembers = InferSelectModel<typeof schema.teamMembers>;
export type Notification = InferSelectModel<typeof schema.notifications>;
