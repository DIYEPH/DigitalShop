import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ORDER_LIST_STATUS_GROUPS } from '../../domain/order-list-status-group';

export class TelegramOrderListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  /** completed = DELIVERED|PAID; pending = PENDING; cancelled = CANCELLED */
  @IsOptional()
  @IsIn(ORDER_LIST_STATUS_GROUPS)
  status?: (typeof ORDER_LIST_STATUS_GROUPS)[number];
}

export interface TelegramOrderListItemDto {
  order_id: string;
  status: string;
  total_price: number;
  currency: string;
  payment_method: string;
  created_at: string;
  first_item_name: string;
  quantity: number;
}

export interface TelegramOrderListResponseDto {
  items: TelegramOrderListItemDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
