import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), "../../.env") });

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string({ message: "The DATABASE_URL environment variable must be set." })
      .url(
        "The value provided for DATABASE_URL is not a valid URL. Please check the format."
      ),

    GOOGLE_CLIENT_ID: z
      .string({
        message: "The GOOGLE_CLIENT_ID environment variable is required.",
      })
      .min(
        1,
        "GOOGLE_CLIENT_ID cannot be empty. Make sure it's set correctly."
      ),

    GOOGLE_CLIENT_SECRET: z
      .string({
        message: "The GOOGLE_CLIENT_SECRET environment variable is required.",
      })
      .min(
        1,
        "GOOGLE_CLIENT_SECRET cannot be empty. Please provide a valid secret."
      ),

    EMAIL_FROM: z
      .string({ message: "The EMAIL_FROM environment variable is required." })
      .email(
        "EMAIL_FROM must be a valid email address (e.g., example@domain.com)."
      ),

    RESEND_API_KEY: z
      .string({
        message: "The RESEND_API_KEY environment variable is required.",
      })
      .min(
        1,
        "RESEND_API_KEY cannot be empty. Please include a valid API key."
      ),

    FRONTEND_URL: z
      .string({ message: "The FRONTEND_URL environment variable is required." })
      .url("FRONTEND_URL must be a valid URL (e.g., http://localhost:3000)."),

    BACKEND_URL: z
      .string({ message: "The BACKEND_URL environment variable is required." })
      .url("BACKEND_URL must be a valid URL (e.g., http://localhost:4000)."),

    PORT: z
      .string({ message: "The PORT environment variable is optional." })
      .optional()
      .default("1284")
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(65535)),

    VALKEY_HOST: z
      .string({ message: "The VALKEY_HOST environment variable is required." })
      .min(1, "VALKEY_HOST cannot be empty.")
      .default("localhost"),

    VALKEY_PORT: z
      .string({ message: "The VALKEY_PORT environment variable is optional." })
      .optional()
      .default("6379")
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(65535)),

    VALKEY_USERNAME: z
      .string({ message: "The VALKEY_USERNAME environment variable is optional." })
      .optional(),

    VALKEY_PASSWORD: z
      .string({ message: "The VALKEY_PASSWORD environment variable is optional." })
      .optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
