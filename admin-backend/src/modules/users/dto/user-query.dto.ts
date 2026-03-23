import { IsEnum, IsOptional, IsString, Length } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { UserRole, UserStatus } from "../../../common/enums";

export class UserQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: "ILIKE email, username, full_name, telegram_id",
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;
}
