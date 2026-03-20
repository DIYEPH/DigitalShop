import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name_en: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name_vi: string;

  @ApiProperty()
  @IsString()
  @Length(1, 5000)
  description_en: string;

  @ApiProperty()
  @IsString()
  @Length(1, 5000)
  description_vi: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  image_url?: string | null;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  category_id: number;
}
