import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsInt, IsOptional, IsString } from 'class-validator';

export class AddStockDto {
  @ApiProperty()
  @IsInt()
  variant_id!: number;

  @ApiProperty({ description: 'Newline-separated payloads or array of strings' })
  @Allow()
  payloads!: string | string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
