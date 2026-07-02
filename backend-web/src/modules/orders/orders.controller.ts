import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WebJwtGuard } from '../../common/guards/web-jwt.guard';
import { AuthUser } from '../auth/types/auth-user';
import {
  ListOrdersQueryDto,
  OrderCheckoutDto,
  PostOrderMessageDto,
} from './dto/orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(WebJwtGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('quote')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  quote(@CurrentUser() user: AuthUser, @Body() dto: OrderCheckoutDto) {
    return this.ordersService.quote(user.id, dto);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() user: AuthUser, @Body() dto: OrderCheckoutDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.list(user.id, query);
  }

  @Get('pending-active')
  getActivePending(@CurrentUser() user: AuthUser) {
    return this.ordersService.getActivePendingOrder(user.id);
  }

  @Get(':id/payment')
  getPayment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.getPayment(user.id, id);
  }

  @Get(':id')
  getDetails(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.getDetails(user.id, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.cancel(user.id, id);
  }

  @Get(':id/messages')
  listMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.listMessages(user.id, id);
  }

  @Post(':id/messages')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  postMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PostOrderMessageDto,
  ) {
    return this.ordersService.postMessage(user.id, id, dto);
  }
}
