import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GrantCouponDto {
  @ApiPropertyOptional({ description: "Comma-separated users.id list" })
  @IsOptional()
  @IsString()
  user_ids?: string;

  @ApiPropertyOptional({ description: "Single users.id fallback" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_id?: number;

  @ApiProperty({ description: "coupons.code" })
  @IsString()
  @Length(3, 32)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
}
