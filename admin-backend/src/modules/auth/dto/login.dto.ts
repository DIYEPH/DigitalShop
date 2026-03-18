import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "admin@digitalshop.dev" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password", minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
