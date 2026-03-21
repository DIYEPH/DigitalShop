import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VolumeTierDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  min_quantity: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(10000)
  discount_bps: number;

  @ApiProperty()
  @IsBoolean()
  is_active: boolean;
}

export class UpdateVolumeTiersDto {
  @ApiProperty({ type: [VolumeTierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VolumeTierDto)
  tiers: VolumeTierDto[];
}
