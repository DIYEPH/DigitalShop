import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BotShopId } from '../../../auth/presentation/decorators/bot-shop.decorator';
import { BotSecretGuard } from '../../../auth/presentation/guards/bot-secret.guard';
import { CancelTelegramOrderUseCase } from '../../application/use-cases/cancel-telegram-order.use-case';
import { CheckTelegramOrderPaymentUseCase } from '../../application/use-cases/check-telegram-order-payment.use-case';
import { CreateTelegramOrderUseCase } from '../../application/use-cases/create-telegram-order.use-case';
import { GetPendingTelegramOrderUseCase } from '../../application/use-cases/get-pending-telegram-order.use-case';
import { GetTelegramOrderDetailUseCase } from '../../application/use-cases/get-telegram-order-detail.use-case';
import { GetTelegramOrderPaymentUseCase } from '../../application/use-cases/get-telegram-order-payment.use-case';
import { ListTelegramOrdersUseCase } from '../../application/use-cases/list-telegram-orders.use-case';
import { QuoteTelegramOrderUseCase } from '../../application/use-cases/quote-telegram-order.use-case';
import { TelegramOrderDetailQueryDto } from '../../application/dto/telegram-order-detail.dto';
import { TelegramOrderListQueryDto } from '../../application/dto/telegram-order-list.dto';
import { TelegramOrderPaymentQueryDto } from '../../application/dto/telegram-order-payment.dto';
import { TelegramOrderCreateDto } from '../../application/dto/telegram-order-create.dto';
import {
  TelegramOrderCancelDto,
  TelegramOrderPendingQueryDto,
} from '../../application/dto/telegram-order-pending.dto';
import { TelegramOrderQuoteDto } from '../../application/dto/telegram-order-quote.dto';

@Controller('order/telegram')
@UseGuards(BotSecretGuard)
export class OrderTelegramController {
  constructor(
    private readonly quoteTelegramOrderUseCase: QuoteTelegramOrderUseCase,
    private readonly createTelegramOrderUseCase: CreateTelegramOrderUseCase,
    private readonly getPendingTelegramOrderUseCase: GetPendingTelegramOrderUseCase,
    private readonly cancelTelegramOrderUseCase: CancelTelegramOrderUseCase,
    private readonly getTelegramOrderPaymentUseCase: GetTelegramOrderPaymentUseCase,
    private readonly checkTelegramOrderPaymentUseCase: CheckTelegramOrderPaymentUseCase,
    private readonly listTelegramOrdersUseCase: ListTelegramOrdersUseCase,
    private readonly getTelegramOrderDetailUseCase: GetTelegramOrderDetailUseCase,
  ) {}

  @Post('quote')
  async quote(@BotShopId() shopId: string, @Body() body: TelegramOrderQuoteDto) {
    const data = await this.quoteTelegramOrderUseCase.execute(shopId, body);
    return { data };
  }

  @Get('pending')
  async getPending(@BotShopId() shopId: string, @Query() query: TelegramOrderPendingQueryDto) {
    const data = await this.getPendingTelegramOrderUseCase.execute(shopId, query);
    return { data };
  }

  @Get()
  async list(@BotShopId() shopId: string, @Query() query: TelegramOrderListQueryDto) {
    const result = await this.listTelegramOrdersUseCase.execute(shopId, query);
    return { data: result.items, meta: result.meta };
  }

  @Post('cancel')
  async cancel(@BotShopId() shopId: string, @Body() body: TelegramOrderCancelDto) {
    const data = await this.cancelTelegramOrderUseCase.execute(shopId, body);
    return { data };
  }

  @Get(':order_id/payment')
  async getPayment(
    @BotShopId() shopId: string,
    @Param('order_id', ParseUUIDPipe) orderId: string,
    @Query() query: TelegramOrderPaymentQueryDto,
  ) {
    const data = await this.getTelegramOrderPaymentUseCase.execute(shopId, {
      order_id: orderId,
      telegram_id: query.telegram_id,
    });
    return { data };
  }

  @Post(':order_id/check-payment')
  async checkPayment(
    @BotShopId() shopId: string,
    @Param('order_id', ParseUUIDPipe) orderId: string,
    @Body() body: TelegramOrderPaymentQueryDto,
  ) {
    const data = await this.checkTelegramOrderPaymentUseCase.execute(shopId, {
      order_id: orderId,
      telegram_id: body.telegram_id,
    });
    return { data };
  }

  @Get(':order_id')
  async getDetail(
    @BotShopId() shopId: string,
    @Param('order_id', ParseUUIDPipe) orderId: string,
    @Query() query: TelegramOrderDetailQueryDto,
  ) {
    const data = await this.getTelegramOrderDetailUseCase.execute(
      shopId,
      orderId,
      query.telegram_id,
    );
    return { data };
  }

  @Post()
  async create(@BotShopId() shopId: string, @Body() body: TelegramOrderCreateDto) {
    const data = await this.createTelegramOrderUseCase.execute(shopId, body);
    return { data };
  }
}
