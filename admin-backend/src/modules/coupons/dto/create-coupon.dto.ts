import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CouponDiscountType, CouponVisibility } from "../../../common/enums";

export class CreateCouponDto {
  @ApiProperty({ description: "coupons.code" })
  @IsString()
  @Length(3, 32)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code: string;

  @ApiProperty({ description: "coupons.variant_id" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variant_id: number;

  @ApiProperty({ enum: CouponDiscountType })
  @IsEnum(CouponDiscountType)
  discount_type: CouponDiscountType;

  @ApiPropertyOptional({
    description: "coupons.percent_bps, required for PERCENT",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  percent_bps?: number;

  @ApiPropertyOptional({
    description: "coupons.amount_usdt, required for FIXED",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount_usdt?: number;

  @ApiPropertyOptional({
    description: "coupons.amount_vnd, required for FIXED",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount_vnd?: number;

  @ApiPropertyOptional({ enum: CouponVisibility })
  @IsOptional()
  @IsEnum(CouponVisibility)
  visibility?: CouponVisibility;

  @ApiPropertyOptional({ description: "coupons.requires_ownership" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requires_ownership?: boolean;

  @ApiPropertyOptional({ description: "coupons.cost_point" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cost_point?: number;

  @ApiPropertyOptional({ description: "coupons.is_active" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: "coupons.starts_at ISO string" })
  @IsOptional()
  @IsString()
  starts_at?: string;

  @ApiPropertyOptional({ description: "coupons.ends_at ISO string" })
  @IsOptional()
  @IsString()
  ends_at?: string;

  @ApiPropertyOptional({ description: "coupons.max_redemptions" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_redemptions?: number;

  @ApiPropertyOptional({ description: "coupons.per_user_limit" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_user_limit?: number;
}
