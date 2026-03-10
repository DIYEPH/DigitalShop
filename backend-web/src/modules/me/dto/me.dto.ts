import { IsEmail, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsEmail()
  email!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  current_password!: string;

  @IsString()
  @MinLength(8)
  new_password!: string;
}
