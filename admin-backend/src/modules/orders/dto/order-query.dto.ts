import { IsEnum, IsIn, IsOptional, IsString, Length } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { OrderStatus } from "../../../common/enums";

export class OrderQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: "Lọc theo orders.payment_code (ILIKE, BINANCE/BANK memo)",
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  payment_code?: string;

  @ApiPropertyOptional({
    description: "Chỉ lấy đơn có yêu cầu bảo hành đang mở",
    enum: ["open"],
  })
  @IsOptional()
  @IsIn(["open"])
  warranty?: "open";
}
