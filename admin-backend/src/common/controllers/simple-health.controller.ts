import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { getPgPool } from "../database/pg-pool";

@ApiTags("Health")
@Controller("ping")
export class SimpleHealthController {
  @Get()
  @ApiOperation({ summary: "Health check (API + database)" })
  @ApiResponse({ status: 200, description: "Service is running" })
  async ping() {
    let database: "connected" | "disconnected" = "disconnected";
    try {
      await getPgPool().query("SELECT 1");
      database = "connected";
    } catch {
      database = "disconnected";
    }

    return {
      status: database === "connected" ? "ok" : "degraded",
      message: "Admin Backend is running",
      database,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
    };
  }
}
