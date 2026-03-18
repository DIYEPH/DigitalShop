import { IsOptional, IsString, MinLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class LogoutDto {
  @ApiPropertyOptional({ description: "Revoke this refresh token on logout" })
  @IsOptional()
  @IsString()
  @MinLength(32)
  refresh_token?: string;
}
