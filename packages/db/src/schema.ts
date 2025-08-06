import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Auth schema
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

// Waitlist Schema
export const waitlist = pgTable("waitlist", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Rate Limiting Schema
export const rateLimitAttempts = pgTable("rate_limit_attempts", {
  identifier: text("identifier").primaryKey(), // e.g., IP address
  count: integer("count").notNull().default(1),
  expiresAt: timestamp("expires_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
});

// Room Schema
export const room = pgTable("room", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
  joinCode: text("join_code").notNull(),
  requireAccessBeforeJoining: boolean("require_access_before_joining")
    .notNull()
    .default(false),
});

// Contact Request Status Enum
export const contactRequestStatusEnum = pgEnum("contact_request_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const contactRequests = pgTable("contact_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  senderId: text("sender_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  receiverEmail: text("receiver_email").notNull(),
  receiverId: text("receiver_id")
    .references(() => user.id, { onDelete: "cascade" }),
  status: contactRequestStatusEnum("status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
}, (table) => ({
  senderIdx: index("contact_requests_sender_id_idx").on(table.senderId),
  receiverEmailIdx: index("contact_requests_receiver_email_idx").on(table.receiverEmail),
  receiverIdIdx: index("contact_requests_receiver_id_idx").on(table.receiverId),
}));

export const contacts = pgTable(
  "contacts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    // Composite primary key for uniqueness
    index("contacts_user_id_idx").on(table.userId),
    index("contacts_contact_id_idx").on(table.contactId),
  ]
);

// Team Schema
export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("teams_creator_id_idx").on(table.creatorId),
  ]
);


export const teamMembers = pgTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [

    index("team_members_team_id_idx").on(table.teamId),
    index("team_members_user_id_idx").on(table.userId),
    index("team_members_team_user_idx").on(table.teamId, table.userId),
  ]
);

// Call Invitation Status Enum
export const callInvitationStatusEnum = pgEnum("call_invitation_status", [
  "pending",
  "accepted",
  "rejected",
]);

// Calls Table
export const calls = pgTable(
  "calls",
  {
    id: text("id").primaryKey(), // 6-char code generado manualmente
    name: text("name").notNull(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("calls_creator_id_idx").on(table.creatorId),
  ]
);

// Call Participants Table - tracks actual participation in calls
export const callParticipants = pgTable(
  "call_participants",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    callId: text("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at")
      .$defaultFn(() => new Date())
      .notNull(),
    leftAt: timestamp("left_at"),
  },
  (table) => [
    index("call_participants_call_id_idx").on(table.callId),
    index("call_participants_user_id_idx").on(table.userId),
  ]
);

// Call Invitations Table
export const callInvitations = pgTable(
  "call_invitations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    callId: text("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    inviteeId: text("invitee_id")
      .references(() => user.id, { onDelete: "set null" }),
    inviteeEmail: text("invitee_email").notNull(),
    status: callInvitationStatusEnum("status").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("call_invitations_call_id_idx").on(table.callId),
    index("call_invitations_invitee_id_idx").on(table.inviteeId),
  ]
);

// Notifications Table
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  type: text("type", { enum: ["call", "contact_request"] }).notNull(),
  callId: text("call_id")
    .references(() => calls.id, { onDelete: "set null" }),
  contactRequestId: text("contact_request_id")
    .references(() => contactRequests.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
}, (table) => ({
  userIdx: index("notifications_user_id_idx").on(table.userId),
}));

// Call Join Request Status Enum
export const callJoinRequestStatusEnum = pgEnum("call_join_request_status", [
  "pending",
  "approved",
  "rejected",
]);

// Call Join Requests Table
export const callJoinRequests = pgTable(
  "call_join_requests",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    callId: text("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: callJoinRequestStatusEnum("status")
      .notNull()
      .$default(() => "pending"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("call_join_requests_call_id_idx").on(table.callId),
    index("call_join_requests_requester_id_idx").on(table.requesterId),
  ]
);

// Hidden Calls Table
export const hiddenCalls = pgTable(
  "hidden_calls",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    callId: text("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    hiddenAt: timestamp("hidden_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    callIdIdx: index("hidden_calls_call_id_idx").on(table.callId),
    userIdIdx: index("hidden_calls_user_id_idx").on(table.userId),
    // Ensure a call can only be hidden once per user
    uniqueIdx: uniqueIndex("hidden_calls_call_user_unique_idx").on(table.callId, table.userId),
  })
);

const schema = {
  user,
  session,
  account,
  verification,
  waitlist,
  rateLimitAttempts,
  room,
  contactRequests,
  contacts,
  teams,
  teamMembers,
  calls,
  callParticipants,
  callInvitations,
  notifications,
  callJoinRequests,
  hiddenCalls,
};

export default schema;
