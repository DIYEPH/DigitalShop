import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;
}

export class OrderCheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsIn(['USDT', 'BINANCE', 'BALANCE'])
  payment_method!: 'USDT' | 'BINANCE' | 'BALANCE';

  @IsOptional()
  @IsIn(['USDT'])
  currency?: 'USDT';

  @IsOptional()
  @IsIn(['TRC20', 'ERC20'])
  network?: 'TRC20' | 'ERC20';

  @IsOptional()
  @IsString()
  coupon_code?: string;
}

export class PostOrderMessageDto {
  @IsString()
  @Length(1, 2000)
  message!: string;

  @IsOptional()
  @IsIn(['TEXT', 'WARRANTY_REQUEST'])
  kind?: 'TEXT' | 'WARRANTY_REQUEST';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order_item_id?: number | null;
}

export class ListOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'DELIVERED', 'CANCELLED'])
  status?: 'PENDING' | 'PAID' | 'DELIVERED' | 'CANCELLED';
}
