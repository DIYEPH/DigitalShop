import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const PAYMENT_METHODS = ['BINANCE', 'BALANCE', 'BALANCE_VND', 'CRYPTO', 'BANK'] as const;

export class TelegramOrderCreateDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @IsInt()
  @Min(1)
  variant_id!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsIn(PAYMENT_METHODS)
  payment_method!: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsString()
  coupon_code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_coupon_id?: number;
}

export interface TelegramOrderCreateResponseDto {
  order_id: string;
  payment_code: string | null;
  status: string;
  payment_method: string;
  currency: string;
  total_price: number;
  expires_at: string | null;
  seconds_left: number | null;
  /** Có giá trị khi BALANCE/BALANCE_VND thanh toán thành công ngay — mảng payload đã giao. */
  delivery_lines: string[] | null;
}
