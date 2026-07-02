import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from "class-validator";

export type ShopPaymentMethod = "BINANCE" | "BANK" | "CRYPTO";
export type ShopPaymentProvider = "BINANCE" | "BANK" | "SEPAY" | "CRYPTO";

const PAYMENT_METHODS: ShopPaymentMethod[] = ["BINANCE", "BANK", "CRYPTO"];

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
  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  payment_method!: ShopPaymentMethod;

  @ApiProperty({ enum: ["BINANCE", "BANK", "SEPAY", "CRYPTO"] })
  @IsIn(["BINANCE", "BANK", "SEPAY", "CRYPTO"])
  provider!: ShopPaymentProvider;

  @ApiPropertyOptional({ example: "Primary Binance account" })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  display_name?: string;

  @ApiPropertyOptional({
    description:
      "Secret payload (encrypted at rest). Omit or send {} to keep the existing secret.",
    example: { api_key: "sepay-api-key" },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Public payload rendered to buyers (wallet, qr_url, bank info).",
    example: { networks: [{ network: "TRC20", wallet_address: "T..." }] },
  })
  @IsOptional()
  @IsObject()
  public_payload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Enable (ACTIVE) or disable this method." })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: "Display priority (lower shows first)." })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

export class ReorderPaymentCredentialsDto {
  @ApiProperty({
    enum: PAYMENT_METHODS,
    isArray: true,
    description: "Payment methods in the desired priority order (first = highest).",
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(PAYMENT_METHODS, { each: true })
  order!: ShopPaymentMethod[];
}
