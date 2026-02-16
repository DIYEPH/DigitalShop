import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class TelegramOrderDetailQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  telegram_id!: number;
}

export interface TelegramOrderDetailItemDto {
  variant_id: number;
  quantity: number;
  unit_price: number;
  snapshot_variant_name: string;
  snapshot_fulfillment_type: string;
}

export interface TelegramOrderDetailResponseDto {
  order_id: string;
  status: string;
  total_price: number;
  currency: string;
  payment_method: string;
  payment_code: string | null;
  created_at: string;
  expires_at: string | null;
  seconds_left: number | null;
  paid_at: string | null;
  delivered_at: string | null;
  items: TelegramOrderDetailItemDto[];
  delivery: {
    lines: string[];
  };
}
