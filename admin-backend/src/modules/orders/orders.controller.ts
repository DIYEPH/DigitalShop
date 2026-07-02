import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ErrorCodes } from "../../common/enums/error-codes.enum";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { CurrentShop } from "../../common/decorators/current-shop.decorator";
import { ShopScoped } from "../../common/decorators/shop-scoped.decorator";
import { ConfirmOrderDto } from "./dto/confirm-order.dto";
import { CreateOrderMessageDto } from "./dto/create-order-message.dto";
import { DeliverOrderDto } from "./dto/deliver-order.dto";
import { OrderQueryDto } from "./dto/order-query.dto";
import { ResolveWarrantyDto } from "./dto/resolve-warranty.dto";
import { OrdersService } from "./orders.service";

type AdminRequest = Request & { user?: { id: number } };

@ApiTags("Orders")
@Controller("orders")
@ShopScoped()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List orders (admin)" })
  findAll(@CurrentShop("id") shopId: string, @Query() query: OrderQueryDto) {
    return this.ordersService.findAll(shopId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order detail (admin)" })
  findOne(@CurrentShop("id") shopId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(shopId, id);
  }

  @Post(":id/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm manual payment (PENDING → PAID)" })
  confirm(
    @CurrentShop("id") shopId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConfirmOrderDto,
  ) {
    return this.ordersService.confirm(shopId, id, dto);
  }

  @Post(":id/deliver")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete delivery (PAID → DELIVERED)" })
  deliver(
    @CurrentShop("id") shopId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DeliverOrderDto,
  ) {
    return this.ordersService.deliver(shopId, id, dto);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "List order chat messages" })
  listMessages(@CurrentShop("id") shopId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.ordersService.listMessages(shopId, id);
  }

  @Post(":id/messages")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Post admin message on order" })
  addMessage(
    @CurrentShop("id") shopId: string,
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
    return this.ordersService.addMessage(shopId, id, dto, adminId);
  }

  @Get(":id/warranty-requests")
  @ApiOperation({ summary: "List warranty requests for an order" })
  listWarranty(
    @CurrentShop("id") shopId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.listWarrantyRequests(shopId, id);
  }

  @Post(":id/warranty-requests/:requestId/resolve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Resolve a warranty request (REPLACED / REFUNDED / REJECTED)",
  })
  resolveWarranty(
    @CurrentShop("id") shopId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("requestId", ParseIntPipe) requestId: number,
    @Body() dto: ResolveWarrantyDto,
    @Req() req: AdminRequest,
  ) {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_INVALID_TOKEN,
        message: "Admin context missing",
      });
    }
    return this.ordersService.resolveWarranty(shopId, id, requestId, dto, adminId);
  }
}
