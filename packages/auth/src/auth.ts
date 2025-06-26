import { extractTokenFromUrl } from "@/utils/extract-token";
import { sendMail } from "@/utils/send-mail";
import { db } from "@call/db";
import schema from "@call/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const {
  FRONTEND_URL,
  BACKEND_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} = process.env;

if (!FRONTEND_URL || !BACKEND_URL) {
  throw new Error(
    "Missing environment variables. FRONTEND_URL or BACKEND_URL is not defined"
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),

  trustedOrigins: [FRONTEND_URL, BACKEND_URL],

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 100,
    resetPasswordTokenExpiresIn: 600, // 10 minutes
    sendResetPassword: async ({ user, url }) => {
      const token = extractTokenFromUrl(url);
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

      await sendMail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${resetUrl}`,
      });
    },
  },

  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
      scope: [
        // "https://www.googleapis.com/auth/userinfo.profile",
        // "https://www.googleapis.com/auth/userinfo.email",
      ],
      accessType: "offline",
      prompt: "consent",
    },
    github: {
      clientId: GITHUB_CLIENT_ID!,
      clientSecret: GITHUB_CLIENT_SECRET!,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
