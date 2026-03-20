import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { CouponDiscountType, CouponVisibility } from "../../../common/enums";

export class CouponQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Search coupons.code (ILIKE)" })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  search?: string;

  @ApiPropertyOptional({ enum: CouponVisibility })
  @IsOptional()
  @IsEnum(CouponVisibility)
  visibility?: CouponVisibility;

  @ApiPropertyOptional({ enum: CouponDiscountType })
  @IsOptional()
  @IsEnum(CouponDiscountType)
  discount_type?: CouponDiscountType;

  @ApiPropertyOptional({ description: "Filter by coupons.requires_ownership" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requires_ownership?: boolean;

  @ApiPropertyOptional({ description: "Filter by coupons.variant_id" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  variant_id?: number;
}
