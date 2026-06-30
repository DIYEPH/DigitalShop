import { IsInt, IsNumber, Min } from 'class-validator';

export class TelegramTopupBinanceCreateDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class TelegramTopupBankCreateDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @IsInt()
  @Min(1)
  amount!: number;
}

export class TelegramTopupCancelDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;
}

export interface TelegramTopupResponseDto {
  topup_id: number;
  provider: string;
  payment_code: string;
  amount: number;
  currency: string;
  status: string;
  binance_id: string | null;
  binance_qr_url: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_owner: string | null;
  vietqr_url: string | null;
  expires_at: string | null;
  seconds_left: number | null;
}

export interface TelegramTopupStatusDto {
  topup_id: number;
  provider: string;
  payment_code: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  expires_at: string | null;
  seconds_left: number | null;
}
