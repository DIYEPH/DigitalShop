import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { getPgPool } from "../../common/database/pg-pool";

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(email: string, password: string) {
    const result = await getPgPool().query<{
      id: number;
      email: string;
      password: string | null;
      role: string;
      full_name: string | null;
    }>(
      `SELECT id, email, password, role, full_name
       FROM users
       WHERE email = $1 AND role = 'ADMIN' AND status = 'ACTIVE'
       LIMIT 1`,
      [email],
    );
    const user = result.rows[0];
    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return {
      access_token: this.jwtService.sign({ sub: user.id, email: user.email, role: user.role }),
      admin: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    };
  }
}
