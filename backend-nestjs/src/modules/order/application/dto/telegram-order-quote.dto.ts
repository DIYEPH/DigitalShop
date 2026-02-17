import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TelegramOrderQuoteDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @IsInt()
  @Min(1)
  variant_id!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  coupon_code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_coupon_id?: number;
}

export interface TelegramOrderQuoteResponseDto {
  variant_id: number;
  quantity: number;
  unit_price_usdt: number;
  unit_price_vnd: number;
  subtotal_usdt: number;
  subtotal_vnd: number;
  discount_usdt: number;
  discount_vnd: number;
  total_usdt: number;
  total_vnd: number;
  volume_tier_applied: { min_quantity: number; discount_bps: number } | null;
  coupon_applied: string | null;
  payment_methods: string[];
  fulfillment_type: string;
  stock_available: number;
}
