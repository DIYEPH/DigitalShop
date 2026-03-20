import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "../auth.service";
import { ErrorCodes } from "../../../common/enums/error-codes.enum";

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_TOKEN,
        message: "Missing or invalid Authorization header",
      });
    }

    const token = header.slice(7);

    try {
      const payload = this.jwtService.verify<{
        sub: number;
        email?: string;
        role?: string;
      }>(token);
      const admin = await this.authService.getActiveAdminById(payload.sub);
      if (!admin) {
        throw new UnauthorizedException({
          code: ErrorCodes.AUTH_USER_NOT_FOUND,
          message: "Admin user not found",
        });
      }
      request.user = admin;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;

      const name = (err as { name?: string })?.name;
      if (name === "TokenExpiredError") {
        throw new UnauthorizedException({
          code: ErrorCodes.AUTH_TOKEN_EXPIRED,
          message: "Authentication token has expired",
        });
      }

      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_TOKEN,
        message: "Invalid authentication token",
      });
    }
  }
}
