import { IsOptional, IsString, Length } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ConfirmOrderDto {
  @ApiPropertyOptional({
    description: "Tx hash (CRYPTO) — ghi vào orders.tx_id",
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  transaction_hash?: string;
}
