import { IsOptional, IsString, Length } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class DeliverOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  delivery_note?: string;
}
