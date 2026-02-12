import { Transform } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class UpdateLanguageDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['en', 'vi', 'ru', 'zh'])
  language!: 'en' | 'vi' | 'ru' | 'zh';
}
