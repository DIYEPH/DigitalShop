import { IsEnum, IsOptional, IsString, Length } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum WarrantyResolution {
  REPLACED = "REPLACED",
  REFUNDED = "REFUNDED",
  REJECTED = "REJECTED",
}

export class ResolveWarrantyDto {
  @ApiProperty({ enum: WarrantyResolution })
  @IsEnum(WarrantyResolution)
  resolution!: WarrantyResolution;

  @ApiPropertyOptional({
    description: "Payload của stock thay thế (bắt buộc khi resolution = REPLACED)",
  })
  @IsOptional()
  @IsString()
  @Length(1, 4000)
  payload?: string;

  @ApiPropertyOptional({ description: "Ghi chú gửi khách (bắt buộc khi REJECTED)" })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;
}
