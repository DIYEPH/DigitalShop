/** Parse JWT_EXPIRES_IN env (e.g. 3d, 1h, 30m, 3600) to seconds for API response. */
export function jwtExpiresInSeconds(): number {
  const raw = (process.env.JWT_EXPIRES_IN || "3d").trim();
  const match = /^(\d+)([smhd])?$/i.exec(raw);
  if (!match) return 3 * 24 * 3600;
  const n = parseInt(match[1], 10);
  const unit = (match[2] || "s").toLowerCase();
  if (unit === "d") return n * 24 * 3600;
  if (unit === "h") return n * 3600;
  if (unit === "m") return n * 60;
  return n;
}
