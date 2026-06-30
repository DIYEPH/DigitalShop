import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TelegramCouponMineQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @IsOptional()
  @IsIn(['active', 'used'])
  status?: 'active' | 'used';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variant_id?: number;
}

export class TelegramCouponRedeemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @IsString()
  code!: string;
}
