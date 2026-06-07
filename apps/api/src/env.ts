import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  devUserId: process.env.DEV_USER_ID,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
};

export const isDev = env.nodeEnv !== "production";
