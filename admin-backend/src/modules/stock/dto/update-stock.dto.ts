import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ description: 'Stock payload (account/key) to fulfil the slot' })
  @IsString()
  @Length(1, 10000)
  payload!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  note?: string;
}
