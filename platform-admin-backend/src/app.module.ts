import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { StringValue } from "ms";
import { AuthController } from "./modules/auth/auth.controller";
import { AuthService } from "./modules/auth/auth.service";
import { PlatformAdminGuard } from "./modules/auth/platform-admin.guard";
import { CategoriesController } from "./modules/categories/categories.controller";
import { CategoriesService } from "./modules/categories/categories.service";
import { ShopsController } from "./modules/shops/shops.controller";
import { ShopsService } from "./modules/shops/shops.service";
import { UsersController } from "./modules/users/users.controller";
import { UsersService } from "./modules/users/users.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env"] }),
    JwtModule.registerAsync({
      useFactory: () => {
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
        return {
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || "3d") as StringValue },
        };
      },
    }),
  ],
  controllers: [AuthController, UsersController, ShopsController, CategoriesController],
  providers: [AuthService, PlatformAdminGuard, UsersService, ShopsService, CategoriesService],
})
export class AppModule {}
