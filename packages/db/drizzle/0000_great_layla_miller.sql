DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_invitation_status') THEN
        CREATE TYPE "public"."call_invitation_status" AS ENUM('pending', 'accepted', 'rejected');
    END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_request_status') THEN
        CREATE TYPE "public"."contact_request_status" AS ENUM('pending', 'accepted', 'rejected');
    END IF;
END$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"call_id" text NOT NULL,
	"invitee_id" text,
	"invitee_email" text NOT NULL,
	"status" "call_invitation_status" NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calls" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_email" text NOT NULL,
	"receiver_id" text,
	"status" "contact_request_status" NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"call_id" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limit_attempts" (
	"identifier" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"join_code" text NOT NULL,
	"require_access_before_joining" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'account_user_id_user_id_fk') THEN
        ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'call_invitations_call_id_calls_id_fk') THEN
        ALTER TABLE "call_invitations" ADD CONSTRAINT "call_invitations_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'call_invitations_invitee_id_user_id_fk') THEN
        ALTER TABLE "call_invitations" ADD CONSTRAINT "call_invitations_invitee_id_user_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'calls_creator_id_user_id_fk') THEN
        ALTER TABLE "calls" ADD CONSTRAINT "calls_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'contact_requests_sender_id_user_id_fk') THEN
        ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'contact_requests_receiver_id_user_id_fk') THEN
        ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'contacts_user_id_user_id_fk') THEN
        ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'contacts_contact_id_user_id_fk') THEN
        ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contact_id_user_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_user_id_fk') THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'notifications_call_id_calls_id_fk') THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'session_user_id_user_id_fk') THEN
        ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'team_members_team_id_teams_id_fk') THEN
        ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'team_members_user_id_user_id_fk') THEN
        ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'teams_creator_id_user_id_fk') THEN
        ALTER TABLE "teams" ADD CONSTRAINT "teams_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END; $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "call_invitations_call_id_idx" ON "call_invitations" ("call_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "call_invitations_invitee_id_idx" ON "call_invitations" ("invitee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calls_creator_id_idx" ON "calls" ("creator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_requests_sender_id_idx" ON "contact_requests" ("sender_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_requests_receiver_email_idx" ON "contact_requests" ("receiver_email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_requests_receiver_id_idx" ON "contact_requests" ("receiver_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_user_id_idx" ON "contacts" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_contact_id_idx" ON "contacts" ("contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_team_id_idx" ON "team_members" ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_user_id_idx" ON "team_members" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_team_user_idx" ON "team_members" ("team_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_creator_id_idx" ON "teams" ("creator_id");
