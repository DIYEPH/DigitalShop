import { applyDecorators, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from "@nestjs/swagger";
import { AdminJwtGuard } from "../../modules/auth/guards/admin-jwt.guard";

/**
 * Decorator to protect endpoints for admin-only access
 * Applies JWT authentication and admin role validation
 */
export function AdminOnly() {
  return applyDecorators(
    UseGuards(AdminJwtGuard),
    ApiBearerAuth("access-token"),
    ApiUnauthorizedResponse({
      description: "Invalid or missing JWT token",
      schema: {
        example: {
          success: false,
          error: {
            code: "AUTH_002",
            message: "Invalid token",
            timestamp: "2026-05-17T09:55:00Z",
            path: "/api/endpoint",
          },
        },
      },
    }),
    ApiForbiddenResponse({
      description: "Admin role required",
      schema: {
        example: {
          success: false,
          error: {
            code: "AUTH_004",
            message: "Admin role required",
            timestamp: "2026-05-17T09:55:00Z",
            path: "/api/endpoint",
          },
        },
      },
    }),
  );
}
