import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FulfillmentType, WarrantyType, WarrantyUnit } from '../../../common/enums';
import { VariantPriceDto } from './variant-price.dto';

export class CreateVariantDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name_en: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name_vi: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  plan_id?: number | null;

  @ApiPropertyOptional({ enum: FulfillmentType })
  @IsOptional()
  @IsEnum(FulfillmentType)
  fulfillment_type?: FulfillmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  preorder_limit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  preorder_delivery_hours?: number | null;

  @ApiPropertyOptional({ enum: WarrantyType })
  @IsOptional()
  @IsEnum(WarrantyType)
  warranty_type?: WarrantyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  warranty_value?: number | null;

  @ApiPropertyOptional({ enum: WarrantyUnit })
  @IsOptional()
  @IsEnum(WarrantyUnit)
  warranty_unit?: WarrantyUnit | null;

  @ApiPropertyOptional({ type: [VariantPriceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantPriceDto)
  prices?: VariantPriceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ type: [String], description: 'USDT → CRYPTO, BINANCE, BALANCE (admin UI labels)' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  payment_methods: string[];
}
