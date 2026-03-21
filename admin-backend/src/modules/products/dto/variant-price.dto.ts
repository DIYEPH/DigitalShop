import { IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../../../common/enums';

export class VariantPriceDto {
  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}
