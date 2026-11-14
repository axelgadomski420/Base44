import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "127.0.0.1",
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  databaseUrl: required("DATABASE_URL"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "https://purrepets.pl",
  corsOrigins: [
    "http://92.5.154.243",
    "http://purrepets.pl",
    "https://purrepets.pl",
    "http://www.purrepets.pl",
    "https://www.purrepets.pl"
  ],
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 26214400),
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
};
