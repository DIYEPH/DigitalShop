import { IsEnum, IsInt, IsOptional, IsString, Length } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MessageKind } from "../../../common/enums";

export class CreateOrderMessageDto {
  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  message: string;

  @ApiPropertyOptional({ enum: MessageKind, default: MessageKind.TEXT })
  @IsOptional()
  @IsEnum(MessageKind)
  kind?: MessageKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  order_item_id?: number;
}
