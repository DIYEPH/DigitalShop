import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";

export type ShopPaymentMethod = "BINANCE" | "BANK" | "CRYPTO";
export type ShopPaymentProvider = "BINANCE" | "BANK" | "SEPAY" | "CRYPTO";

export class UpdateTelegramBotDto {
  @ApiProperty({ example: "123456:ABC-telegram-bot-token" })
  @IsString()
  @Length(20, 256)
  bot_token!: string;

  @ApiPropertyOptional({ example: "my_shop_bot" })
  @IsOptional()
  @IsString()
  @Matches(/^@?[A-Za-z0-9_]{5,32}$/)
  bot_username?: string | null;

  @ApiPropertyOptional({ enum: ["ACTIVE", "SUSPENDED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "SUSPENDED"])
  status?: "ACTIVE" | "SUSPENDED";
}

export class UpsertPaymentCredentialDto {
  @ApiProperty({ enum: ["BINANCE", "BANK", "CRYPTO"] })
  @IsIn(["BINANCE", "BANK", "CRYPTO"])
  payment_method!: ShopPaymentMethod;

  @ApiProperty({ enum: ["BINANCE", "BANK", "SEPAY", "CRYPTO"] })
  @IsIn(["BINANCE", "BANK", "SEPAY", "CRYPTO"])
  provider!: ShopPaymentProvider;

  @ApiProperty({ example: "Primary Binance account" })
  @IsString()
  @Length(2, 120)
  display_name!: string;

  @ApiProperty({
    example: { api_key: "binance-api-key", api_secret: "binance-api-secret" },
  })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { pay_id: "123456789", account_label: "DigitalShop" },
  })
  @IsOptional()
  @IsObject()
  public_payload?: Record<string, unknown>;
}
