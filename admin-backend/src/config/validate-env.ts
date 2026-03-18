const DEV_JWT_PLACEHOLDER = "dev-only-set-JWT_SECRET-in-env";

/** Fail fast khi thiếu biến bắt buộc (đặc biệt production). */
export function validateEnv(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required");
  }

  const nodeEnv = process.env.NODE_ENV || "development";
  const secret = process.env.JWT_SECRET?.trim();

  if (nodeEnv === "production") {
    if (!secret || secret.length < 32) {
      throw new Error(
        "JWT_SECRET is required in production (min 32 characters)",
      );
    }
    return;
  }

  if (!secret) {
    console.warn(
      "[admin-backend] JWT_SECRET not set — using dev placeholder. Set JWT_SECRET in .env before production.",
    );
    process.env.JWT_SECRET = DEV_JWT_PLACEHOLDER;
  }
}
