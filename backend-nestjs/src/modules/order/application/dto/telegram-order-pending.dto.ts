import { Type } from 'class-transformer';
import { IsInt, IsString, IsUUID, Min } from 'class-validator';

export class TelegramOrderPendingQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  telegram_id!: number;
}

export class TelegramOrderCancelDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @IsString()
  @IsUUID()
  order_id!: string;
}

export interface TelegramOrderPendingResponseDto {
  order_id: string;
  payment_code: string | null;
  status: string;
  payment_method: string;
  currency: string;
  total_price: number;
  quantity: number;
  item_name: string;
  expires_at: string | null;
  seconds_left: number | null;
}
