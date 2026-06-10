import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  devUserId: process.env.DEV_USER_ID,
  // Used to build the JWKS URL for verifying Supabase access tokens. The project
  // signs tokens with asymmetric keys (ES256), so we verify against its public
  // JWKS rather than a shared HS256 secret.
  supabaseUrl: process.env.SUPABASE_URL,
  // Comma-separated list of browser origins allowed to call the API (the deployed
  // web app). Empty in dev, where we fall back to localhost (see app.ts).
  corsOrigins: (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};

export const isDev = env.nodeEnv !== "production";
