import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TelegramLoginDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  full_name?: string;
}
