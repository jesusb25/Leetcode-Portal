import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  devUserId: process.env.DEV_USER_ID,
  // Used to build the JWKS URL for verifying Supabase access tokens. The project
  // signs tokens with asymmetric keys (ES256), so we verify against its public
  // JWKS rather than a shared HS256 secret.
  supabaseUrl: process.env.SUPABASE_URL,
};

export const isDev = env.nodeEnv !== "production";
