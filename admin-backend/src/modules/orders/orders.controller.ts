import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ErrorCodes } from "../../common/enums/error-codes.enum";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AdminOnly } from "../../common/decorators/admin-only.decorator";
import { ConfirmOrderDto } from "./dto/confirm-order.dto";
import { CreateOrderMessageDto } from "./dto/create-order-message.dto";
import { DeliverOrderDto } from "./dto/deliver-order.dto";
import { OrderQueryDto } from "./dto/order-query.dto";
import { OrdersService } from "./orders.service";

type AdminRequest = Request & { user?: { id: number } };

@ApiTags("Orders")
@Controller("orders")
@AdminOnly()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List orders (admin)" })
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order detail (admin)" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Post(":id/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm manual payment (PENDING → PAID)" })
  confirm(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConfirmOrderDto,
  ) {
    return this.ordersService.confirm(id, dto);
  }

  @Post(":id/deliver")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete delivery (PAID → DELIVERED)" })
  deliver(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DeliverOrderDto,
  ) {
    return this.ordersService.deliver(id, dto);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "List order chat messages" })
  listMessages(@Param("id", ParseUUIDPipe) id: string) {
    return this.ordersService.listMessages(id);
  }

  @Post(":id/messages")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Post admin message on order" })
  addMessage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateOrderMessageDto,
    @Req() req: AdminRequest,
  ) {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_INVALID_TOKEN,
        message: "Admin context missing",
      });
    }
    return this.ordersService.addMessage(id, dto, adminId);
  }
}
