import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserStatus } from "../../../common/enums";

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
