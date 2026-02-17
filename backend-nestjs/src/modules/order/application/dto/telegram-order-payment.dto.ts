import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class TelegramOrderPaymentQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  telegram_id!: number;
}

export interface TelegramOrderPaymentParams {
  order_id: string;
  telegram_id: number;
}

export interface TelegramOrderPaymentResponseDto {
  order_id: string;
  status: string;
  payment_method: string;
  currency: string;
  total_price: number;
  payment_code: string | null;
  binance_id: string | null;
  binance_qr_url: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_owner: string | null;
  vietqr_url: string | null;
  expires_at: string | null;
  seconds_left: number | null;
  delivery_lines: string[] | null;
}
