import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name_en: string;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name_vi: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
