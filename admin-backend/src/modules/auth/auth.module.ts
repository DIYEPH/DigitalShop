import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminJwtGuard } from "./guards/admin-jwt.guard";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("jwt.secret");
        if (!secret) {
          throw new Error("JWT_SECRET is not configured");
        }
        return {
          secret,
          signOptions: {
            expiresIn: config.get<string>("jwt.expiresIn") || "3d",
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminJwtGuard],
  exports: [AuthService, AdminJwtGuard, JwtModule],
})
export class AuthModule {}
