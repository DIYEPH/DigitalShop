export default () => ({
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production",
    logging: process.env.NODE_ENV === "development",
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "3d",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) || [
      "http://localhost:4100",
    ],
    credentials: true,
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
    enableRateLimit: process.env.ENABLE_RATE_LIMITING !== "false",
    maxRequestsPerMinute: parseInt(
      process.env.MAX_REQUESTS_PER_MINUTE || "1000",
      10,
    ),
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "pretty",
  },

  healthCheck: {
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || "5000", 10),
  },
});
