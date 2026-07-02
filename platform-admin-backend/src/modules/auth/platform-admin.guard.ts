import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { getPgPool } from "../../common/database/pg-pool";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Authorization header");
    }

    const payload = this.jwtService.verify<{ sub: number }>(header.slice(7));
    const result = await getPgPool().query(
      `SELECT id, email, role, full_name
       FROM users
       WHERE id = $1 AND role = 'ADMIN' AND status = 'ACTIVE'
       LIMIT 1`,
      [payload.sub],
    );
    const user = result.rows[0];
    if (!user) throw new UnauthorizedException("Platform admin access required");
    request.user = user;
    return true;
  }
}
