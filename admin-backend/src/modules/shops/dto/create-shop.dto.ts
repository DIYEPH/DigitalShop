import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateShopDto {
  @ApiProperty({ example: "Seller Shop" })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: "seller-shop" })
  @IsString()
  @Length(3, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  logo_url?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  support_url?: string | null;
}

export class UpdateShopDto {
  @ApiPropertyOptional({ example: "Seller Shop" })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  logo_url?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  support_url?: string | null;
}

export class AddShopMemberDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  user_id!: number;

  @ApiProperty({ enum: ["MANAGER", "STAFF"] })
  @IsString()
  @Matches(/^(MANAGER|STAFF)$/)
  role!: "MANAGER" | "STAFF";
}

export class SelectShopCategoriesDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  category_ids!: number[];
}
