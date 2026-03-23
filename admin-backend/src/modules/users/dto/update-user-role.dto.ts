import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../../../common/enums";

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}
